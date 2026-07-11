import {
  activeSegment,
  fivePointColor,
  fivePointLabel,
  SEGMENT_LABELS,
} from "../lib/ratingScale";

interface TrackProps {
  rating: number | null;
  mini?: boolean;
  ariaLabel?: string;
}

export function SegmentTrack({ rating, mini, ariaLabel }: TrackProps) {
  const color = fivePointColor(rating);
  const active = rating !== null ? activeSegment(rating) : -1;

  return (
    <div
      className={`segment-rating-track${mini ? " mini" : ""}`}
      aria-label={ariaLabel ?? (rating !== null ? `${rating} out of 5` : "unrated")}
    >
      {SEGMENT_LABELS.map((segLabel, i) => (
        <div
          key={segLabel}
          className={`segment-rating-seg${i <= active ? " filled" : ""}${i === active ? " active" : ""}`}
          style={i <= active ? { background: color, borderColor: color } : undefined}
          title={segLabel}
        />
      ))}
    </div>
  );
}

interface Props {
  label: string;
  rating: number | null;
  compact?: boolean;
}

export default function SegmentRatingBar({ label, rating, compact }: Props) {
  const color = fivePointColor(rating);

  return (
    <div className={`segment-rating-bar${compact ? " compact" : ""}`}>
      <div className="segment-rating-head">
        <span className="segment-rating-label">{label}</span>
        {rating !== null ? (
          <span className="segment-rating-value" style={{ color }}>
            {rating}<span className="segment-rating-denom">/5</span>
          </span>
        ) : (
          <span className="segment-rating-value muted">—</span>
        )}
      </div>
      <SegmentTrack rating={rating} ariaLabel={`${label}: ${rating ?? "unrated"} out of 5`} />
      {!compact && rating !== null && (
        <span className="segment-rating-sublabel" style={{ color }}>
          {fivePointLabel(rating)}
        </span>
      )}
    </div>
  );
}
