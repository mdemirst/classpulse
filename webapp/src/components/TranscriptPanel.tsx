interface Props {
  transcript: string | null;
}

export default function TranscriptPanel({ transcript }: Props) {
  return (
    <details className="transcript-panel">
      <summary>Transcript</summary>
      {transcript ? (
        <div className="transcript-body">{transcript}</div>
      ) : (
        <div className="transcript-empty">
          Transcript will appear after audio processing.
        </div>
      )}
    </details>
  );
}
