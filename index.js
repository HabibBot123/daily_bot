const { RTVIClient } = require('realtime-ai');
const { DailyTransport } = require('@daily-co/realtime-ai-daily');

function myTrackHandler(track, participant) {
  if (participant.local || track.kind !== "audio") {
    return;
  }
  let audioElement = document.createElement("audio");
  audioElement.srcObject = new MediaStream([track]);
  document.body.appendChild(audioElement);
  audioElement.play();
}

const rtviClient = new RTVIClient({
  params: {
    baseUrl: process.env.BASE_URL || "/api",
  },
  transport: new DailyTransport(),
  enableMic: true,
  callbacks: {
    onTrackStart: myTrackHandler,
  },
});

rtviClient.connect();

// Exportez ce dont vous pourriez avoir besoin
module.exports = {
  RTVIClient,
  DailyTransport,
  rtviClient
};