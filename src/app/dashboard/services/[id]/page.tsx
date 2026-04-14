export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-4xl text-text-primary">Service #{params.id}</h1>
    </div>
  );
}
