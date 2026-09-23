// Processes items in fixed-size concurrent batches — used by any admin
// action that fans out to many external calls (Paystack, Microsoft Graph
// email) in a single request, e.g. "send a payment reminder to everyone
// unpaid" or "send tickets to everyone confirmed without one". A single
// unbounded Promise.all over hundreds of items risks tripping Paystack/Graph's
// own rate limits; a fully sequential loop is needlessly slow. Each item's
// own failure is caught and reported rather than allowed to sink the batch —
// one bad email address shouldn't stop 199 good ones from sending.
export const runInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<R>
): Promise<{ succeeded: number; failed: { item: T; error: unknown }[] }> => {
  let succeeded = 0;
  const failed: { item: T; error: unknown }[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(batch.map(handler));
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        succeeded += 1;
      } else {
        failed.push({ item: batch[idx], error: result.reason });
      }
    });
  }

  return { succeeded, failed };
};
