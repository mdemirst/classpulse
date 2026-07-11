import { fivePointColor } from "../lib/ratingScale";
import { SegmentTrack } from "./SegmentRatingBar";

interface Props {
  rating: number | null;
}

export default function RatingCell({ rating }: Props) {
  if (rating === null) return <span className="rating-cell-empty">—</span>;
  const color = fivePointColor(rating);
  return (
    <div className="rating-cell-inline">
      <span className="rating-cell-value" style={{ color }}>{rating}/5</span>
      <SegmentTrack rating={rating} mini />
    </div>
  );
}
