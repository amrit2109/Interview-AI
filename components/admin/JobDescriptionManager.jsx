"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddJobDescriptionModal } from "@/components/admin/AddJobDescriptionModal";
import { AddCandidateModal } from "@/components/admin/AddCandidateModal";
import { FileTextIcon, UserPlusIcon } from "lucide-react";

/**
 * Client component: Add JD and Add Candidate buttons + modals. Renders next to Admin Dashboard heading.
 */
export function JobDescriptionManager() {
  const router = useRouter();
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);

  const handleJdSuccess = () => {
    router.refresh();
  };

  const handleCandidateSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCandidateModalOpen(true)}
          aria-label="Add Candidate"
        >
          <UserPlusIcon className="mr-2 size-4" />
          Add Candidate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setJdModalOpen(true)}
          aria-label="Add Job Description"
        >
          <FileTextIcon className="mr-2 size-4" />
          Add Job Description (JD)
        </Button>
      </div>
      <AddCandidateModal
        open={candidateModalOpen}
        onOpenChange={setCandidateModalOpen}
        onSuccess={handleCandidateSuccess}
      />
      <AddJobDescriptionModal
        open={jdModalOpen}
        onOpenChange={setJdModalOpen}
        onSuccess={handleJdSuccess}
      />
    </>
  );
}
