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
import { getJobDescriptionsAction } from "@/app/admin/actions";
import { UploadIcon, FileTextIcon, BarChart3Icon, BriefcaseIcon } from "lucide-react";

/**
 * Add Candidate modal with resume upload, AI-powered parsing, prefilled fields,
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
      const res = await fetch("/api/candidates/analyze-resume", {
        method: "POST",
        body: formData,
      });
      let json;
      try {
        json = await res.json();
      } catch {
        setError("Resume analysis failed. Invalid response from server.");
        return;
      }
      if (!res.ok) {
        let errMsg = json?.error ?? "Resume analysis failed.";
        if (typeof errMsg === "object") errMsg = "Resume analysis failed. Please try again later.";
        else if (typeof errMsg !== "string") errMsg = "Resume analysis failed.";
        else if (errMsg.length > 300 || errMsg.includes('"code":')) {
          errMsg = "Resume analysis failed. Please try again later.";
        }
        setError(errMsg);
        return;
      }
      setParsed(json);
      const c = json.candidate ?? {};
      const expYears = c.experienceYears;
      const expStr = expYears != null ? `${expYears} years` : (c.experienceSummary ?? "");
      setName((c.fullName ?? "").trim());
      setEmail((c.email ?? "").trim().toLowerCase());
      setPhone((c.phone ?? "").trim());
      setExperience(expStr.trim());
      setSkills(Array.isArray(c.skills) ? c.skills.join(", ") : "");
      setEducation(Array.isArray(c.education) ? c.education.join(", ") : "");
      setPosition((json.match?.roleName ?? "").trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume analysis failed. Please try again later.");
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
      let resumeLink = null;
      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("email", trimmedEmail);
        const uploadRes = await fetch("/api/candidates/upload-resume", {
          method: "POST",
          body: uploadFormData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadJson?.error ?? "Failed to upload resume.");
          return;
        }
        resumeLink = uploadJson?.resumeLink ?? null;
      }

      const matchedJd = jobDescriptions.find((jd) => jd.jobName === position);
      const res = await fetch("/api/candidates/send-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: phone?.trim() || undefined,
          position: position || undefined,
          atsScore: parsed?.ats?.score ?? parsed?.atsScore,
          skills: skills?.trim() || undefined,
          experienceYears: parsed?.candidate?.experienceYears ?? undefined,
          education: education?.trim() || undefined,
          atsExplanation: parsed?.ats?.explanation || undefined,
          matchedRoleId: matchedJd?.id ?? parsed?.match?.roleId ?? undefined,
          matchPercentage: parsed?.match?.percentage ?? undefined,
          matchReasoning: parsed?.match?.reasoning || undefined,
          resumeLink: resumeLink || undefined,
        }),
      });
      const json = await res.json();
      const apiError = json?.error;
      const data = json?.data;
      const emailError = json?.emailError;
      if (!res.ok && res.status !== 207) {
        setError(apiError ?? "Failed to send interview link.");
        return;
      }
      if (apiError && !data) {
        setError(apiError);
        return;
      }
      if (res.status === 207 && apiError) {
        setError(emailError ? `${apiError} (${emailError})` : apiError);
        return;
      }
      handleOpenChange(false);
      onSuccess?.(data ?? json);
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
                    {parsed?.ats?.score ?? parsed?.atsScore ?? "—"}/10
                  </p>
                  {parsed?.ats?.explanation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {parsed.ats.explanation}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BriefcaseIcon className="size-4" />
                    Best Match
                  </div>
                  <p className="text-base font-medium">
                    {parsed?.match?.roleName ?? parsed?.bestRole?.jobName ?? "—"}
                    {parsed?.match?.percentage != null && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({parsed.match.percentage}%)
                      </span>
                    )}
                  </p>
                  {parsed?.match?.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {parsed.match.reasoning}
                    </p>
                  )}
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
