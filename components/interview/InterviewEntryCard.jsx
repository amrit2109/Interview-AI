"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BriefcaseIcon,
  BuildingIcon,
  ClockIcon,
  MicIcon,
  PlayIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
} from "lucide-react";

const STATUS_CONFIG = {
  valid: {
    label: "Valid",
    variant: "default",
    Icon: CheckCircleIcon,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    Icon: XCircleIcon,
  },
  alreadyUsed: {
    label: "Already Used",
    variant: "secondary",
    Icon: AlertCircleIcon,
  },
};

/**
 * @param {object} props
 * @param {object} props.interview
 * @param {string} props.token
 */
export function InterviewEntryCard({ interview, token }) {
  const config = STATUS_CONFIG[interview.status] ?? STATUS_CONFIG.valid;
  const StatusIcon = config.Icon;
  const canStart = interview.status === "valid";

  return (
    <Card className="w-full max-w-xl" size="sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl sm:text-2xl">{interview.jobTitle}</CardTitle>
            <Badge variant={config.variant} className="gap-1">
              <StatusIcon className="size-3" />
              {config.label}
            </Badge>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
            <span className="flex items-center gap-1.5">
              <BuildingIcon className="size-4 shrink-0" aria-hidden />
              {interview.company}
            </span>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <BriefcaseIcon className="size-4 shrink-0" aria-hidden />
              {interview.department}
            </span>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-4 shrink-0" aria-hidden />
              {interview.estimatedDuration}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Interview Type</p>
          <p className="text-sm text-muted-foreground">{interview.interviewType}</p>
        </div>
        {interview.instructions?.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Before you start
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" role="list">
                {interview.instructions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircleIcon
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {canStart ? (
          <Button asChild size="lg" className="w-full sm:w-auto" data-icon="inline-start">
            <Link href={`/interview/${token}/prescreen`}>
              <PlayIcon className="size-4" />
              Start Interview
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {interview.status === "expired" && "This interview link has expired."}
            {interview.status === "alreadyUsed" &&
              "This interview has already been completed."}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
