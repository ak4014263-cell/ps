import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";

interface ProjectPDFGeneratorProps {
    projectId: string;
    projectName: string;
    vendorId?: string;
    groups: any[];
    templates: any[];
}

export function ProjectPDFGenerator({ projectName }: ProjectPDFGeneratorProps) {
    const handleGenerate = () => {
        toast.info("PDF Generation feature for " + projectName + " is coming soon!");
    };

    return (
        <Button variant="outline" onClick={handleGenerate}>
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF (Coming Soon)
        </Button>
    );
}
