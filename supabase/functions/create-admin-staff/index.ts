import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { DEFAULT_ADMIN_STAFF_PERMISSIONS } from "../../../src/lib/staffPermissions.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminStaffRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
  permissions?: string[];
}

export async function POST(req: Request) {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser(token);

    if (!authUser) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    const isSuperAdmin = userRoles?.some((r) => r.role === "super_admin");
    if (!isSuperAdmin) {
      throw new Error("Only super admins can create admin staff");
    }

    const {
      email,
      password,
      fullName,
      role,
      permissions,
    } = await req.json() as CreateAdminStaffRequest;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      throw new Error("Missing required fields: email, password, fullName, role");
    }

    // Create auth user
    const {
      data: { user: newUser },
      error: authError,
    } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName },
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    if (!newUser) {
      throw new Error("User creation returned no user data");
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: newUser.id,
        full_name: fullName,
        email,
      },
    ]);

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Add role to user_roles table
    const { error: roleError } = await supabase.from("user_roles").insert([
      {
        user_id: newUser.id,
        role: role.startsWith("admin_") ? "admin_staff" : role,
      },
    ]);

    if (roleError) {
      await supabase.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Create admin_staff record
    const staffPermissions =
      permissions || DEFAULT_ADMIN_STAFF_PERMISSIONS[role] || [];
    const { error: staffError } = await supabase
      .from("admin_staff")
      .insert([
        {
          admin_user_id: authUser.id,
          staff_user_id: newUser.id,
          role,
          permissions: staffPermissions,
          active: true,
        },
      ]);

    if (staffError) {
      await supabase.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to create admin staff record: ${staffError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin staff member created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating admin staff:", message);

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

Deno.serve(POST);
