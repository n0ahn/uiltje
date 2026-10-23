// Did a test ask the whole set? A challenge only counts such a test (ai/sql/009). The practice screen can hold just the
// picked terms ("Oefen selectie") under the same set id, so this compares with the complete set from storage.
import { coversAll, type TestKind } from '../engine/options';
import type { PracticeRow } from '../engine/types';
import type { StudySet } from '../schema/types';
import type { StorageAdapter } from '../storage/adapter';

export async function testCoversWholeSet(storage: Pick<StorageAdapter, 'getSet'>, kind: TestKind, tested: readonly PracticeRow[]): Promise<boolean> {
	const ids = [...new Set(tested.map((row) => row.setId))];
	if (ids.length === 0) return false;
	try {
		const sets = (await Promise.all(ids.map((id) => storage.getSet(id)))).filter((set): set is StudySet => set !== null);
		return sets.length === ids.length && coversAll(sets, kind, tested);
	} catch {
		return false;
	}
}
