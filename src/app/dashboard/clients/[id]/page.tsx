export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-4xl text-text-primary">Client #{params.id}</h1>
    </div>
  );
}
