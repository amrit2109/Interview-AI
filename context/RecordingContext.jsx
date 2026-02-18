"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import * as recordingService from "@/lib/services/screen-recording.service";

const RecordingContext = createContext(null);

export function RecordingProvider({ children }) {
  useEffect(() => {
    return () => {
      recordingService.terminateRecording();
    };
  }, []);

  const value = useMemo(
    () => ({
      subscribe: recordingService.subscribe,
      startRecording: recordingService.startRecording,
      stopRecording: recordingService.stopRecording,
      terminateRecording: recordingService.terminateRecording,
      getRecordingState: recordingService.getRecordingState,
      isRecordingActive: recordingService.isRecordingActive,
      isSupported: recordingService.isSupported,
    }),
    []
  );

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) {
    throw new Error("useRecording must be used within RecordingProvider");
  }
  return ctx;
}
