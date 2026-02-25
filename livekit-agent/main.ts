/**
 * LiveKit interview agent using Gemini Live API.
 * Strict turn-taking: mic disabled during question speech, enabled only after playout.
 */
import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  READ_QUESTION_PREFIX,
  SUBMIT_ANSWER_PREFIX,
  INTERVIEW_CONTROL_TOPIC,
} from "./interview-constants.js";

dotenv.config({ path: ".env.local" });

const INTERVIEW_INSTRUCTIONS = `You are an interview assistant for candidates in India.
When the user sends you text that starts with "Please read this interview question aloud" or similar, speak the question exactly as written.
Use a slow, clear, and measured pace—easy to follow and understand.
Use natural Indian English accent and pronunciation.
Do not add commentary, rephrasing, or extra words. Read the question verbatim.
Pause briefly between sentences. Sound natural and human, not robotic.
When the user speaks (their answer), only listen. Do not speak, evaluate, or comment until the next question is sent.`;

function emitControl(ctx: JobContext, ev: { type: string }) {
  try {
    const data = new TextEncoder().encode(JSON.stringify(ev));
    ctx.room.localParticipant?.publishData(data, {
      reliable: true,
      topic: INTERVIEW_CONTROL_TOPIC,
    });
  } catch (err) {
    console.error("[interview-agent] emitControl failed:", err);
  }
}

function createTextInputCallback(
  session: InstanceType<typeof voice.AgentSession>,
  ctx: JobContext
) {
  return async (sess: InstanceType<typeof voice.AgentSession>, ev: { text: string }) => {
    if (ev.text.startsWith(READ_QUESTION_PREFIX)) {
      const questionText = ev.text.slice(READ_QUESTION_PREFIX.length).trim();
      sess.interrupt();
      sess.input.setAudioEnabled(false);
      emitControl(ctx, { type: "agent_speaking_started" });
      try {
        const handle = sess.say(questionText, {
          allowInterruptions: false,
          addToChatCtx: false,
        });
        await handle.waitForPlayout();
      } finally {
        emitControl(ctx, { type: "agent_speaking_finished" });
        emitControl(ctx, { type: "user_turn_open" });
        sess.input.setAudioEnabled(true);
      }
      return;
    }
    if (ev.text.startsWith(SUBMIT_ANSWER_PREFIX)) {
      sess.interrupt();
      sess.input.setAudioEnabled(false);
      return;
    }
    sess.interrupt();
    sess.generateReply({ userInput: ev.text });
  };
}

export default defineAgent({
  prewarm: async (_proc: JobProcess) => {
    // No VAD prewarm needed for Gemini realtime (built-in)
  },
  entry: async (ctx: JobContext) => {
    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Kore",
        temperature: 0.45,
        instructions: INTERVIEW_INSTRUCTIONS,
      }),
      tts: new google.beta.TTS({ voiceName: "Kore" }),
    });

    await session.start({
      agent: new voice.Agent({
        instructions: INTERVIEW_INSTRUCTIONS,
      }),
      room: ctx.room,
      inputOptions: {
        textInputCallback: createTextInputCallback(session, ctx),
      },
    });

    const greetHandle = await session.generateReply({
      instructions:
        "Greet the candidate briefly. Say you are ready to begin the interview and will read each question when it appears.",
    });
    await greetHandle.waitForPlayout();
    emitControl(ctx, { type: "agent_ready" });

    await ctx.waitForParticipant();
  },
});

cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "interview-agent",
  })
);
