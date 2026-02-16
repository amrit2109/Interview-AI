"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getJobDescriptionsAction,
  analyzeCandidateResumeMockAction,
  createCandidateMockAction,
} from "@/app/admin/actions";
import { UploadIcon, FileTextIcon, BarChart3Icon, BriefcaseIcon } from "lucide-react";

/**
 * Add Candidate modal with resume upload, AI review (mock), prefilled fields,
 * ATS score out of 10, and best role recommendation.
 */
export function AddCandidateModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [position, setPosition] = useState("");

  const loadJobDescriptions = useCallback(async () => {
    const { data } = await getJobDescriptionsAction();
    setJobDescriptions(data ?? []);
  }, []);

  const handleOpenChange = (next) => {
    if (!next) {
      setFile(null);
      setIsAnalyzing(false);
      setIsSubmitting(false);
      setError(null);
      setParsed(null);
      setName("");
      setEmail("");
      setPhone("");
      setExperience("");
      setSkills("");
      setEducation("");
      setPosition("");
    }
    onOpenChange(next);
  };

  const handleOpen = (isOpen) => {
    if (isOpen) {
      loadJobDescriptions();
    }
    handleOpenChange(isOpen);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setParsed(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const valid = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].some(
      (t) => f.type === t
    ) || f.name?.toLowerCase().endsWith(".pdf") || f.name?.toLowerCase().endsWith(".txt") || f.name?.toLowerCase().endsWith(".doc") || f.name?.toLowerCase().endsWith(".docx");
    if (!valid) {
      setError("Please upload a PDF, TXT, or Word document.");
      return;
    }
    setError(null);
    setFile(f);
    setParsed(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select or drop a resume file first.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error: apiError } = await analyzeCandidateResumeMockAction(formData);
      if (apiError) {
        setError(apiError);
        return;
      }
      setParsed(data);
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setExperience(data.experience ?? "");
      setSkills(data.skills ?? "");
      setEducation(data.education ?? "");
      setPosition(data.bestRole?.jobName ?? "");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error: apiError } = await createCandidateMockAction({
        name: trimmedName,
        email: trimmedEmail,
        phone: phone?.trim() || undefined,
        position: position || undefined,
        atsScore: parsed?.atsScore,
      });
      if (apiError) {
        setError(apiError);
        return;
      }
      handleOpenChange(false);
      onSuccess?.(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showForm = !!parsed;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        size="lg"
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm ? (
            <>
              <div
                role="button"
                tabIndex={0}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById("candidate-resume-input")?.click();
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-8 transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onClick={() => document.getElementById("candidate-resume-input")?.click()}
              >
                <UploadIcon className="size-10 text-muted-foreground" />
                <p className="text-center text-sm font-medium text-foreground">
                  Drop your resume here or click to browse
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  PDF, TXT, or Word (DOC/DOCX)
                </p>
                <input
                  id="candidate-resume-input"
                  type="file"
                  accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Choose resume file"
                />
              </div>

              {file && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1 min-w-0">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setParsed(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                aria-busy={isAnalyzing}
                className="w-full sm:w-auto"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze Resume"}
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>
                      <Label htmlFor="candidate-name">Name</Label>
                    </FieldLabel>
                    <Input
                      id="candidate-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <Label htmlFor="candidate-email">Email</Label>
                    </FieldLabel>
                    <Input
                      id="candidate-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      disabled={isSubmitting}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>
                    <Label htmlFor="candidate-phone">Phone</Label>
                  </FieldLabel>
                  <Input
                    id="candidate-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <Label htmlFor="candidate-experience">Experience</Label>
                  </FieldLabel>
                  <Input
                    id="candidate-experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5 years"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <Label htmlFor="candidate-skills">Skills</Label>
                  </FieldLabel>
                  <Input
                    id="candidate-skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Skills (comma separated)"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <Label htmlFor="candidate-education">Education</Label>
                  </FieldLabel>
                  <Input
                    id="candidate-education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="Degree, institution"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <Label>Position / Role</Label>
                  </FieldLabel>
                  <Select
                    value={position || undefined}
                    onValueChange={setPosition}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobDescriptions.map((jd) => (
                        <SelectItem key={jd.id} value={jd.jobName}>
                          {jd.jobName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BarChart3Icon className="size-4" />
                    ATS Score
                  </div>
                  <p className="text-2xl font-bold">
                    {parsed?.atsScore ?? "—"}/10
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BriefcaseIcon className="size-4" />
                    Best Match
                  </div>
                  <p className="text-base font-medium">
                    {parsed?.bestRole?.jobName ?? "—"}
                  </p>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setParsed(null)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send Interview link"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>

        {!showForm && error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
