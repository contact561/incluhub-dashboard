type QueryErrorStateProps = {
  message: string;
};

export function QueryErrorState({ message }: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-medium">Could not load users</p>
      <p className="mt-1 text-red-700">{message}</p>
    </div>
  );
}
