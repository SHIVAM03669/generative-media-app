import GenerationCard from './GenerationCard.jsx';

export default function Gallery({
  items,
  activeId,
  onTweak,
  onOpenCanvas,
  onDelete,
  onRetry,
}) {
  if (!items.length) {
    return (
      <section className="gallery gallery--empty">
        <h2>Gallery</h2>
        <p>No generations yet. Create your first image above.</p>
      </section>
    );
  }

  return (
    <section className="gallery">
      <h2>Gallery</h2>
      <ul className="gallery__grid">
        {items.map((item) => (
          <GenerationCard
            key={item.id}
            item={item}
            items={items}
            active={activeId === item.id}
            onTweak={(gen) => onTweak(gen, items)}
            onOpenCanvas={onOpenCanvas}
            onDelete={onDelete}
            onRetry={onRetry}
          />
        ))}
      </ul>
    </section>
  );
}
