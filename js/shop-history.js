// A manually registered sale and its Wix order describe the same purchase.
export function uniquePurchaseRecords(records, wixOrders = []) {
  const liveIds = new Set(wixOrders.map(order => order._id));
  const unique = new Map();
  for (const record of records) {
    if (record.wixOrderId && liveIds.has(record.wixOrderId)) continue;
    const key = record.wixOrderId ? `wix:${record.wixOrderId}` : `record:${record.id}`;
    if (!unique.has(key) || record.source === 'wix_store') unique.set(key, record);
  }
  return [...unique.values()];
}
