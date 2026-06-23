function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function DesignerCard({ name, role, image, selected, onSelect }) {
  return (
    <article className={`designer-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="designer-card-button" onClick={onSelect}>
        <div className="designer-photo">
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <span className="designer-initials" aria-hidden="true">{initials(name)}</span>
          )}
        </div>
        <h3 className="designer-name">{name}</h3>
        <p className="designer-role">{role}</p>
      </button>
    </article>
  )
}
