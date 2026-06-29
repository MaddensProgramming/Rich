import type { ResourceId } from '../simulation';

interface ResourceIconProps {
  resourceId: ResourceId;
  label?: string;
}

function ResourceGlyph({ resourceId }: { resourceId: ResourceId }) {
  switch (resourceId) {
    case 'vegetables':
      return (
        <>
          <path className="carrot" d="M11.7 7.4c3.5 1.2 4.9 4.5 3.4 8.4L8.5 20c-1.6-4.2-.2-10.8 3.2-12.6Z" />
          <path className="leaf" d="M11.4 7.7C8.2 6.4 6.6 4.1 7.5 2.1c2.9.1 4.9 1.7 5.3 4.4 1.6-2.5 4.1-3.4 6.8-2.5-.5 2.7-2.7 4.3-6.2 4.4Z" />
          <path className="carrot-wrinkle" d="m10.2 10.8 2.5.7-.3 1-2.5-.7.3-1ZM9.2 14.4l2.2.6-.3 1-2.2-.6.3-1Z" />
        </>
      );
    case 'food':
      return (
        <>
          <path className="crust-shadow" d="M2.2 14.3c0-4.6 4.6-8.2 10.6-8.2 5.2 0 9 3.1 9.5 7.2.4 3.5-3.4 5.9-10 5.9-6.2 0-10.1-1.9-10.1-4.9Z" />
          <path className="crumb" d="M2.2 13.7c0-4 4.7-7.3 10.5-7.3 5.1 0 8.9 2.9 9.2 6.8.3 3.2-3.2 5.6-9.8 5.6-5.8 0-9.9-1.9-9.9-5.1Z" />
          <path className="crust" d="M6.2 8.4c.9-.5 2-.9 3.2-1.2.3 2.7-.3 5.3-1.6 6.1-1.1.7-2.1-.5-2.1-2.3 0-1 .2-1.8.5-2.6ZM12.6 6.5c1.2.1 2.4.3 3.4.7-.2 3-.9 5.6-2.3 6.4-1.2.8-2.1-.5-2-2.8.1-1.5.4-2.9.9-4.3ZM18.4 9c1 .8 1.8 1.8 2.3 2.9-.7 2.2-1.9 3.5-3 3.5-1.1 0-1.6-1.2-1-2.9.3-1.3.9-2.4 1.7-3.5Z" />
          <path className="crust-shadow" d="M11.8 18.8c5.3-.2 8.8-2.1 10-4.7-.2 3.1-3.7 5.2-9.6 5.2-4.3 0-7.5-.9-9-2.7 1.7 1.4 4.6 2.2 8.6 2.2Z" opacity="0.42" />
        </>
      );
    case 'wood':
      return (
        <>
          <path className="bark" d="M7.2 7.5h10.9c1.5 0 2.6 2 2.6 4.5s-1.1 4.5-2.6 4.5H7.2V7.5Z" />
          <ellipse className="cut" cx="7.2" cy="12" rx="3.4" ry="4.5" />
          <ellipse className="wood-ring" cx="7.2" cy="12" rx="1.6" ry="2.2" />
          <path className="bark-dark" d="M10.2 9.1h7.4v1.4h-7.4V9.1ZM10.3 13.5h7.1v1.3h-7.1v-1.3Z" />
        </>
      );
    case 'stone':
      return (
        <>
          <path className="rock-shadow" d="m3.8 15.5 2.5-7 6-3.1 5.5 2.2 2.4 6.3-3.6 4.6H8l-4.2-3Z" />
          <path className="rock" d="m5.7 14.8 2-5.1 4.7-2.5 4.1 1.7 1.8 4.8-2.7 3.2H8.4l-2.7-2.1Z" />
          <path className="rock-light" d="m7.7 9.7 4.7-2.5 1.2 4-4.4.7-1.5-2.2Z" />
          <path className="rock-facet" d="m13.6 11.2 2.9-2.3 1.8 4.8-2.7 3.2-2-5.7Z" />
        </>
      );
    case 'coal':
      return (
        <>
          <path className="coal" d="m3.8 15.1 2.3-6.8 6.2-2.7 5.7 2.6 2.2 6.3-3.8 3.8H7.9l-4.1-3.2Z" />
          <path className="coal-light" d="m6.1 8.3 6.2-2.7-1.8 5.9-5 2.5.6-5.7Z" />
          <path className="coal-shine" d="m14.7 8 3.3.2 2.2 6.3-4.7-2.3-.8-4.2Z" />
        </>
      );
    case 'iron_ore':
      return (
        <>
          <path className="ore" d="m4.1 15.2 2.8-6.3 5.2-2.9 5.5 2.4 2.3 6.4-3.6 3.4H7.8l-3.7-3Z" />
          <path className="ore-light" d="m6.9 8.9 5.2-2.9 1.4 5.3-4.3 1.4-2.3-3.8Z" />
          <path className="vein" d="M12.4 10.5c2.7-1 4.6-.4 5.3 1.4.6 1.7-.5 3.7-2.7 4.8-2.4.1-4-.8-4.6-2.5-.5-1.5.2-2.9 2-3.7Z" />
          <path className="vein-light" d="M13.3 11.5c1.6-.5 2.6-.2 3 .7.3.8-.3 1.8-1.6 2.4-1.4 0-2.3-.4-2.6-1.2-.3-.8.1-1.5 1.2-1.9Z" />
        </>
      );
    case 'iron_bars':
      return (
        <>
          <path className="metal-dark" d="m3.5 13.2 10.9-2.1 4.1 3.4-10.9 2.2-4.1-3.5Z" />
          <path className="metal" d="m7.6 16.7 10.9-2.2-1.3 3.5-10.9 2.2 1.3-3.5Z" />
          <path className="ore-light" d="m4.8 13.3 9.4-1.8 2.5 2.2-9.3 1.8-2.6-2.2Z" opacity="0.72" />
          <path className="metal-dark" d="m6.3 9.5 10.9-2.1 3.7 3.2L10 12.8 6.3 9.5Z" />
          <path className="metal" d="m10 12.8 10.9-2.2-1.3 3.5-10.9 2.2 1.3-3.5Z" />
          <path className="ore-light" d="m7.5 9.6 9.4-1.8 2.3 2-9.3 1.9-2.4-2.1Z" opacity="0.72" />
          <path className="metal-dark" d="m8.5 5.6 10.2-2 3 2.9-10.2 2-3-2.9Z" />
          <path className="metal" d="m11.5 8.5 10.2-2-1.2 3.3-10.2 2 1.2-3.3Z" />
          <path className="ore-light" d="m9.7 5.8 8.8-1.7 1.7 1.7-8.6 1.7-1.9-1.7Z" opacity="0.76" />
        </>
      );
    case 'bows':
      return (
        <>
          <path className="stroke wood-line" d="M15.2 3.9c4.3 5.1 4.3 10.4 0 15.2" />
          <path className="stroke string" d="M15.2 3.9 15.2 19.1" />
          <path className="stroke arrow" d="M5 11.5h10.9" />
          <path className="fill arrow-head" d="m18.7 11.5-3 2.1V9.4l3 2.1Z" />
        </>
      );
    case 'swords':
      return (
        <>
          <g transform="rotate(-45 12 12)">
            <path className="blade" d="M11 2.1h2l.7 11.5L12 16.2l-1.7-2.6L11 2.1Z" />
            <path className="ore-light" d="M11.1 3.1h.7l.2 11.8-1-1.5.1-10.3Z" opacity="0.82" />
            <path className="hilt-fill" d="M6.5 15.1h11c.7 0 1.2.5 1.2 1.1s-.5 1.1-1.2 1.1h-11c-.7 0-1.2-.5-1.2-1.1s.5-1.1 1.2-1.1Z" />
            <path className="pommel" d="M10.7 17h2.6v3.9h-2.6V17Z" />
            <path className="hilt-fill" d="M10.3 20.6h3.4l.9 1.2-.9 1.2h-3.4l-.9-1.2.9-1.2Z" />
          </g>
          <g transform="rotate(45 12 12)">
            <path className="blade" d="M11 2.1h2l.7 11.5L12 16.2l-1.7-2.6L11 2.1Z" />
            <path className="ore-light" d="M11.1 3.1h.7l.2 11.8-1-1.5.1-10.3Z" opacity="0.82" />
            <path className="hilt-fill" d="M6.5 15.1h11c.7 0 1.2.5 1.2 1.1s-.5 1.1-1.2 1.1h-11c-.7 0-1.2-.5-1.2-1.1s.5-1.1 1.2-1.1Z" />
            <path className="pommel" d="M10.7 17h2.6v3.9h-2.6V17Z" />
            <path className="hilt-fill" d="M10.3 20.6h3.4l.9 1.2-.9 1.2h-3.4l-.9-1.2.9-1.2Z" />
          </g>
        </>
      );
    case 'planks':
      return (
        <>
          <g transform="rotate(-45 12 12)">
            <path className="plank-dark" d="M3.2 8.1h17.6l1.7 7.8H1.5l1.7-7.8Z" />
            <path className="plank-light" d="M4.4 9.1h15.4l1 5.6H3.1l1.3-5.6Z" />
            <path className="plank" d="M3.1 14.7h17.7l1.7 1.2H1.5l1.6-1.2Z" opacity="0.58" />
            <path className="stroke" d="M5.2 10.9c3.1-.9 6.3-.7 9.7.4 1.6.5 3 .4 4.2-.3" style={{ stroke: '#3f2417', strokeWidth: 1.02 }} />
            <path className="stroke" d="M4.9 13.3c2.3-.7 4.4-.8 6.4-.2 2.3.7 4.6.4 6.9-.8" style={{ stroke: '#3f2417', strokeWidth: 1.02 }} />
            <path className="stroke" d="M12.9 10.6c-.4 1.1-.1 1.9.9 2.2 1.1.3 2-.2 2.7-1.4" style={{ stroke: '#3f2417', strokeWidth: 1.02 }} />
          </g>
        </>
      );
    case 'tools':
      return (
        <>
          <path className="stroke handle" d="m6.2 18 7.8-7.8" />
          <path className="fill tool-head" d="M14.8 4.2c1.3-.5 3-.2 4 .8l-3 3 1.7 1.7 3-3c1 1.8.2 4.2-1.7 5.1-1.4.7-3.1.5-4.3-.4l-7.8 7.8-2-2 7.8-7.8c-.9-1.5-.6-4 .3-5.2Z" />
        </>
      );
    case 'stone_blocks':
      return (
        <>
          <path className="block-top" d="m5.1 8.6 7-3.3 6.8 3.3-6.9 3.2-6.9-3.2Z" />
          <path className="block" d="M5.1 8.6 12 11.8v7.1l-6.9-3.2V8.6Z" />
          <path className="block-dark" d="m12 11.8 6.9-3.2v7.1L12 18.9v-7.1Z" />
          <path className="block-light" d="m7.4 9.7 4.7-2.2 4.5 2.1-4.6 2.2-4.6-2.1Z" />
        </>
      );
    default:
      return null;
  }
}

export function ResourceIcon({ resourceId, label }: ResourceIconProps) {
  return (
    <span className={`resource-icon resource-icon-${resourceId}`} aria-hidden={label ? undefined : true} aria-label={label}>
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <ResourceGlyph resourceId={resourceId} />
      </svg>
    </span>
  );
}
