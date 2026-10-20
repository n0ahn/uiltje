// Editor working copy of a set: like StudySet, but with plain strings instead of null (text inputs)
// and rows that may still be incomplete. It only becomes a StudySet through EditorState.toStudySet().
import type { ListKind, ListTemplate, SetSettings, StudyRow } from '../schema/types';

export type DraftRow = StudyRow;

export type DraftList = {
	id: string;
	template: ListTemplate;
	kind: ListKind;
	title: string;
	group: string;
	columns: { prompt: string; answer: string };
	dimensions: string[];
	rows: DraftRow[];
};

export type DraftSet = {
	id: string;
	title: string;
	subject: string;
	folder: string;
	settings: SetSettings;
	lists: DraftList[];
};