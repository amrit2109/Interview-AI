/**
 * LiveKit interview agent using Gemini Live API.
 * Dispatched to rooms when candidate joins (RoomAgentDispatch in token).
 * Reads questions verbatim when client sends text via lk.chat (bypasses LLM for TTS).
 */
import { WorkerOptions, cli, defineAgent, voice, } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
/** Must match lib/interview-constants.ts READ_QUESTION_PREFIX (client–agent contract). */
const READ_QUESTION_PREFIX = "Please read this interview question aloud exactly as written: ";
const INTERVIEW_INSTRUCTIONS = `You are an interview assistant for candidates in India.
When the user sends you text that starts with "Please read this interview question aloud" or similar, speak the question exactly as written.
Use a slow, clear, and measured pace—easy to follow and understand.
Use natural Indian English accent and pronunciation.
Do not add commentary, rephrasing, or extra words. Read the question verbatim.
Pause briefly between sentences. Sound natural and human, not robotic.
When the user speaks (their answer), only listen. Do not speak, evaluate, or comment until the next question is sent.`;
function createTextInputCallback(_session) {
    return (sess, ev) => {
        if (ev.text.startsWith(READ_QUESTION_PREFIX)) {
            const questionText = ev.text.slice(READ_QUESTION_PREFIX.length).trim();
            sess.interrupt();
            sess.say(questionText);
            return;
        }
        sess.interrupt();
        sess.generateReply({ userInput: ev.text });
    };
}
export default defineAgent({
    prewarm: async (_proc) => {
        // No VAD prewarm needed for Gemini realtime (built-in)
    },
    entry: async (ctx) => {
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
                textInputCallback: createTextInputCallback(session),
            },
        });
        await session.generateReply({
            instructions: "Greet the candidate briefly. Say you are ready to begin the interview and will read each question when it appears.",
        });
        await ctx.waitForParticipant();
    },
});
cli.runApp(new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "interview-agent",
}));
