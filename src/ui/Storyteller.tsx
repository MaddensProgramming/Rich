import { useEffect, useState } from 'react';
import storytellerPortrait from '../assets/characters/storyteller.jpg';
import { storyteller, type StorySegment } from '../data/story';

interface StorytellerProps {
  segment: StorySegment;
  onDismiss: () => void;
}

export function Storyteller({ segment, onDismiss }: StorytellerProps) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    setLineIndex(0);
  }, [segment.id]);

  const isLastLine = lineIndex >= segment.lines.length - 1;

  const advance = () => {
    if (isLastLine) {
      onDismiss();
      return;
    }
    setLineIndex((index) => Math.min(index + 1, segment.lines.length - 1));
  };

  return (
    <div className="storyteller-shell" role="dialog" aria-modal="true" aria-label={segment.title}>
      <button className="storyteller-backdrop" type="button" aria-label="Dismiss story" onClick={onDismiss} />
      <section className="storyteller-card">
        <img className="storyteller-portrait" src={storytellerPortrait} alt={`${storyteller.name}, ${storyteller.role}`} />
        <div className="storyteller-copy">
          <header className="storyteller-header">
            <span>{segment.speaker} · {storyteller.role}</span>
            <strong>{segment.title}</strong>
          </header>
          <p className="storyteller-line">{segment.lines[lineIndex]}</p>
          <p className="storyteller-goal">Goal: {segment.goal}</p>
          <div className="storyteller-actions">
            <span className="storyteller-progress">
              {lineIndex + 1} / {segment.lines.length}
            </span>
            <div>
              <button type="button" className="storyteller-skip" onClick={onDismiss}>
                Skip
              </button>
              <button type="button" className="storyteller-next" onClick={advance}>
                {isLastLine ? 'Continue' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
