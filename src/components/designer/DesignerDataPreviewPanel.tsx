import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Play, RefreshCw, Database, Eye, Code, Upload, FileSpreadsheet, Image, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { apiService } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface SampleDataField {
  key: string;
  value: string;
  type: 'text' | 'image' | 'barcode' | 'qrcode';
}

interface ProjectClient {
  id: string;
  name: string;
  institution_name: string;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
}

interface DesignerDataPreviewPanelProps {
  onPreviewData: (data: Record<string, string>) => void;
  onResetPreview: () => void;
  isPreviewMode: boolean;
  onTogglePreviewMode: (enabled: boolean) => void;
  onClose: () => void;
  detectedVariables: string[];
  projectId?: string;
  projectClient?: ProjectClient;
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  // Student/Person fields
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  className: '10th Grade',
  sec: 'A',
  admNo: 'ADM2024001',
  roll_no: '15',
  schoolCode: 'SCH001',
  session: '2024-25',
  dob: '15 Jan 2010',
  blood_group: 'O+',
  gender: 'Male',
  address: '123 Main Street, City',
  fatherName: 'Robert Doe',
  motherName: 'Jane Doe',
  fatherMobNo: '+91 98765 43210',
  motherMobNo: '+91 98765 43211',
  phone: '+91 98765 43210',
  email: 'john.doe@school.edu',
  id_number: 'ID2024001',
  rfid: 'RFID12345',
  // Client/Company fields
  institution_name: 'Sample Institution',
  client_name: 'Mr. Administrator',
  client_phone: '+91 98765 00000',
  client_email: 'admin@institution.edu',
  client_designation: 'Principal',
  client_address: '456 Institution Road',
  client_city: 'Mumbai',
  client_state: 'Maharashtra',
  client_pincode: '400001',
};

export function DesignerDataPreviewPanel({
  onPreviewData,
  onResetPreview,
  isPreviewMode,
  onTogglePreviewMode,
  onClose,
  detectedVariables,
  projectId,
  projectClient,
}: DesignerDataPreviewPanelProps) {
  const [sampleData, setSampleData] = useState<Record<string, string>>(DEFAULT_SAMPLE_DATA);
  const [customJson, setCustomJson] = useState<string>('');
  const [photoHeadroom, setPhotoHeadroom] = useState(0); // Headroom control for image preview
  const [activeTab, setActiveTab] = useState<'fields' | 'json' | 'import' | 'database' | 'client'>('fields');
  const [importedRecords, setImportedRecords] = useState<Record<string, string>[]>([]);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [selectedClientId, setSelectedClientId] = useState<string>(projectClient?.id || '');
  const [dbRecordIndex, setDbRecordIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select project when projectId prop is provided
  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, selectedProjectId]);

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-preview'],
    queryFn: async () => {
      try {
        const response = await apiService.projectsAPI.getAll();
        const projectsList = response?.data || response || [];
        // Map to expected format
        return projectsList.map((p: any) => ({
          id: p.id,
          name: p.project_name || p.name,
          project_number: p.project_number || p.id,
        }));
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
      }
    },
  });

  // Fetch clients for dropdown - prioritize project's client if projectId is provided
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-for-preview', projectId],
    queryFn: async () => {
      try {
        // If projectId is provided, fetch the project's client first
        if (projectId) {
          try {
            const projectResponse = await apiService.projectsAPI.getById(projectId);
            const project = projectResponse?.data || projectResponse;
            if (project?.client_id) {
              // Fetch the specific client
              const clientResponse = await apiService.clientsAPI.getById(project.client_id);
              const client = clientResponse?.data || clientResponse;
              if (client) {
                // Also fetch all clients to show in dropdown, but prioritize this one
                const allClientsResponse = await apiService.clientsAPI.getAll();
                const allClients = allClientsResponse?.data || allClientsResponse || [];
                const filteredClients = allClients.filter((c: any) => c.active !== false);
                // Put project's client first
                const otherClients = filteredClients.filter((c: any) => c.id !== client.id);
                return [client, ...otherClients].slice(0, 100);
              }
            }
          } catch (err) {
            console.warn('Could not fetch project client, falling back to all clients:', err);
          }
        }
        // Otherwise fetch all active clients
        const response = await apiService.clientsAPI.getAll();
        const clientsList = response?.data || response || [];
        return clientsList.filter((c: any) => c.active !== false).slice(0, 100);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        return [];
      }
    },
  });

  // Fetch data records for selected project (template's project)
  const { data: dataRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['data-records-for-preview', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      try {
        const response = await apiService.dataRecordsAPI.getByProject(selectedProjectId, {
          order_by: 'record_number',
          order: 'asc',
        });
        const records = response?.data || response || [];
        // Parse JSON fields if needed
        return records.map((record: any) => ({
          ...record,
          data_json: typeof record.data_json === 'string' 
            ? JSON.parse(record.data_json) 
            : record.data_json,
        })).slice(0, 100);
      } catch (error) {
        console.error('Failed to fetch data records:', error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // Auto-populate client data when projectClient is provided
  useEffect(() => {
    if (projectClient) {
      setSelectedClientId(projectClient.id);
      const clientData: Record<string, string> = {
        ...sampleData,
        institution_name: projectClient.institution_name || '',
        client_name: projectClient.name || '',
        client_phone: projectClient.phone || '',
        client_email: projectClient.email || '',
        client_designation: projectClient.designation || '',
        client_address: projectClient.address || '',
        client_city: projectClient.city || '',
        client_state: projectClient.state || '',
        client_pincode: projectClient.pincode || '',
        company_logo: projectClient.logo_url || '',
        company_signature: projectClient.signature_url || '',
      };
      setSampleData(clientData);
    }
  }, [projectClient]);

  // Map client data to template variables
  const mapClientToPreviewData = (client: typeof clients[0]) => {
    return {
      ...sampleData,
      institution_name: client.institution_name || '',
      client_name: client.name || '',
      client_phone: client.phone || '',
      client_email: client.email || '',
      client_designation: client.designation || '',
      client_address: client.address || '',
      client_city: client.city || '',
      client_state: client.state || '',
      client_pincode: client.pincode || '',
      company_logo: client.logo_url || '',
      company_signature: client.signature_url || '',
    };
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const clientData = mapClientToPreviewData(client);
      setSampleData(clientData);
      if (isPreviewMode) {
        onPreviewData(clientData);
        toast.success(`Client "${client.institution_name}" data loaded`);
      }
    }
  };

  // Update sample data fields based on detected variables
  // Include `photo` as an editable variable so users can map/display it.
  const relevantFields = detectedVariables.filter(v => 
    !['barcode', 'qr_code'].includes(v)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const records = results.data as Record<string, string>[];
        if (records.length > 0) {
          setImportedRecords(records.filter(r => Object.keys(r).length > 1));
          setCurrentRecordIndex(0);
          setSampleData(records[0]);
          toast.success(`Imported ${records.length} records from CSV`);
        }
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });
  };

  const handleFieldChange = (key: string, value: string) => {
    setSampleData(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyPreview = () => {
    if (activeTab === 'json') {
      try {
        const parsed = JSON.parse(customJson);
        const dataWithHeadroom = { ...parsed, __photoHeadroom: photoHeadroom.toString() };
        setSampleData(parsed);
        onPreviewData(dataWithHeadroom);
        toast.success('Preview data applied');
      } catch (e) {
        toast.error('Invalid JSON format');
      }
    } else if (activeTab === 'database' && dataRecords.length > 0) {
      const record = dataRecords[dbRecordIndex];
      const recordData = {
        ...(typeof record.data_json === 'object' ? record.data_json as Record<string, string> : {}),
        photo: record.photo_url || record.cropped_photo_url || '',
        photo_url: record.photo_url || '',
        cropped_photo_url: record.cropped_photo_url || '',
      };
      setSampleData(recordData);
      const recordDataWithHeadroom = { ...recordData, __photoHeadroom: photoHeadroom.toString() };
      onPreviewData(recordDataWithHeadroom);
      toast.success('Database record applied');
    } else if (activeTab === 'client' && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        const clientData = mapClientToPreviewData(client);
        const dataWithHeadroom = { ...clientData, __photoHeadroom: photoHeadroom.toString() };
        setSampleData(clientData);
        onPreviewData(dataWithHeadroom);
        toast.success('Client data applied');
      }
    } else {
      const dataWithHeadroom = { ...sampleData, __photoHeadroom: photoHeadroom.toString() };
      onPreviewData(dataWithHeadroom);
      toast.success('Preview data applied');
    }
  };

  const handleReset = () => {
    setSampleData(DEFAULT_SAMPLE_DATA);
    onResetPreview();
    toast.success('Preview reset to template');
  };

  const handleLoadFromJson = () => {
    try {
      const parsed = JSON.parse(customJson);
      setSampleData(parsed);
      toast.success('Data loaded from JSON');
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const handleExportJson = () => {
    setCustomJson(JSON.stringify(sampleData, null, 2));
    setActiveTab('json');
  };

  const handleLoadDbRecord = (index: number) => {
    if (dataRecords[index]) {
      setDbRecordIndex(index);
      const record = dataRecords[index];
      const recordData = {
        ...(typeof record.data_json === 'object' ? record.data_json as Record<string, string> : {}),
        photo: record.photo_url || record.cropped_photo_url || '',
        photo_url: record.photo_url || '',
        cropped_photo_url: record.cropped_photo_url || '',
      };
      setSampleData(recordData);
      if (isPreviewMode) {
        onPreviewData(recordData);
      }
    }
  };

  // When preview mode is toggled on, automatically apply the current sample data
  useEffect(() => {
    if (isPreviewMode) {
      onPreviewData(sampleData);
    } else {
      onResetPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode]);

  return (
    <div className="w-80 bg-card border-r shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Preview
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Preview Mode</Label>
          <Switch
            checked={isPreviewMode}
            onCheckedChange={onTogglePreviewMode}
          />
        </div>
        {isPreviewMode && (
          <p className="text-xs text-muted-foreground bg-primary/10 rounded p-2">
            Variables are replaced with sample data
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {detectedVariables.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Detected Variables ({detectedVariables.length})
              </Label>
              <div className="flex flex-wrap gap-1">
                {detectedVariables.map(v => (
                  <span key={v} className="text-xs bg-muted px-2 py-0.5 rounded">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No variables detected. Add text elements with {`{{variableName}}`} syntax.
            </p>
          )}

          <Separator />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fields' | 'json' | 'import' | 'database' | 'client')}>
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="fields" className="text-xs" title="Sample Fields">
                <Eye className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="client" className="text-xs" title="Client Data">
                <Building2 className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="database" className="text-xs" title="Project Records">
                <Users className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs" title="Import CSV">
                <FileSpreadsheet className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs" title="Custom JSON">
                <Code className="h-3 w-3" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="mt-3 space-y-3">
              {relevantFields.length > 0 ? (
                <>
                  {relevantFields.map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{field}</Label>
                      <Input
                        value={sampleData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        placeholder={`Enter ${field}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                  
                  <Separator />
                  
                  {/* Face Crop Headroom Control */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-medium">Face Crop Headroom: {photoHeadroom}%</Label>
                    <p className="text-xs text-muted-foreground">0% = centered, 50% = top-aligned</p>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={photoHeadroom}
                      onChange={(e) => setPhotoHeadroom(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Centered</span>
                      <span>Top-Aligned</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Add variable text fields to see them here
                </p>
              )}
            </TabsContent>

            <TabsContent value="client" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Select Client/Institution</Label>
                <Select value={selectedClientId} onValueChange={handleClientSelect}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-xs">
                          {client.institution_name} - {client.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No clients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <div className="space-y-3">
                  {(() => {
                    const client = clients.find(c => c.id === selectedClientId);
                    if (!client) return null;
                    
                    return (
                      <>
                        {/* Logo and Signature preview */}
                        <div className="flex gap-3">
                          {client.logo_url && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                Logo
                              </Label>
                              <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
                                <img 
                                  src={client.logo_url} 
                                  alt="Company logo"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}
                          {client.signature_url && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                Signature
                              </Label>
                              <div className="w-16 h-12 rounded border overflow-hidden bg-muted">
                                <img 
                                  src={client.signature_url} 
                                  alt="Signature"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Client data fields */}
                        <div className="text-xs space-y-1.5 bg-muted rounded p-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Institution:</span>
                            <span className="font-medium truncate ml-2">{client.institution_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contact:</span>
                            <span className="truncate ml-2">{client.name}</span>
                          </div>
                          {client.designation && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Designation:</span>
                              <span className="truncate ml-2">{client.designation}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="truncate ml-2">{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Email:</span>
                              <span className="truncate ml-2">{client.email}</span>
                            </div>
                          )}
                          {client.city && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">City:</span>
                              <span className="truncate ml-2">{client.city}, {client.state}</span>
                            </div>
                          )}
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => {
                            const clientData = mapClientToPreviewData(client);
                            setSampleData(clientData);
                            if (isPreviewMode) {
                              onPreviewData(clientData);
                              toast.success('Client data applied to preview');
                            }
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Apply Client Data
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}

              {!selectedClientId && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Select a client to use their actual data for company/institution variables
                </p>
              )}
            </TabsContent>

            <TabsContent value="database" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Select Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        {project.project_number} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProjectId && (
                <div className="space-y-3">
                  {loadingRecords ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Loading records...</p>
                  ) : dataRecords.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span>Record {dbRecordIndex + 1} of {dataRecords.length}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            disabled={dbRecordIndex === 0}
                            onClick={() => handleLoadDbRecord(dbRecordIndex - 1)}
                          >
                            Prev
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            disabled={dbRecordIndex >= dataRecords.length - 1}
                            onClick={() => handleLoadDbRecord(dbRecordIndex + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                      
                      {/* Show photo preview if available */}
                      {(dataRecords[dbRecordIndex]?.photo_url || dataRecords[dbRecordIndex]?.cropped_photo_url) && (
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Image className="h-3 w-3" />
                            Photo Preview
                          </Label>
                          <div className="w-16 h-20 rounded border overflow-hidden bg-muted">
                            <img 
                              src={dataRecords[dbRecordIndex].cropped_photo_url || dataRecords[dbRecordIndex].photo_url || ''} 
                              alt="Record photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Show record data preview */}
                      <div className="text-xs bg-muted rounded p-2 max-h-32 overflow-auto">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(dataRecords[dbRecordIndex].data_json, null, 2)}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No data records in this project
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="import" className="mt-3 space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV/Excel
              </Button>
              
              {importedRecords.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span>Record {currentRecordIndex + 1} of {importedRecords.length}</span>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2"
                        disabled={currentRecordIndex === 0}
                        onClick={() => {
                          const newIndex = currentRecordIndex - 1;
                          setCurrentRecordIndex(newIndex);
                          setSampleData(importedRecords[newIndex]);
                          onPreviewData(importedRecords[newIndex]);
                        }}
                      >
                        Prev
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2"
                        disabled={currentRecordIndex >= importedRecords.length - 1}
                        onClick={() => {
                          const newIndex = currentRecordIndex + 1;
                          setCurrentRecordIndex(newIndex);
                          setSampleData(importedRecords[newIndex]);
                          onPreviewData(importedRecords[newIndex]);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preview each record or use them to generate templates.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="mt-3 space-y-3">
              <Textarea
                value={customJson || JSON.stringify(sampleData, null, 2)}
                onChange={(e) => setCustomJson(e.target.value)}
                placeholder='{"name": "John Doe", ...}'
                className="min-h-[200px] font-mono text-xs bg-background text-foreground border-border"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={handleLoadFromJson}>
                Load from JSON
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2 flex-shrink-0">
        <Button 
          className="w-full" 
          onClick={handleApplyPreview}
          disabled={!isPreviewMode}
        >
          <Play className="h-4 w-4 mr-2" />
          Apply Preview
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleReset}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleExportJson}>
            <Code className="h-3 w-3 mr-1" />
            To JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
