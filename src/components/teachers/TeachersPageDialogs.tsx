import { LuPlus } from 'react-icons/lu';
import type { NavigateFunction } from 'react-router-dom';
import { TeacherFormDialog } from '@/components/teachers/TeacherFormDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { getDisplayName } from '@/lib/display-name';
import { buildTeacherInfoPath } from '@/lib/teachers/teacherInfoTabsHelpers';
import { buildTeacherFormDialogOpenChangeHandler } from '@/lib/teachers/teachersPageShellHelpers';
import type { TeacherWithLessonTypes } from '@/types/teachers';

interface TeachersPageDialogsProps {
	teacherFormDialog: { open: boolean; teacher: TeacherWithLessonTypes | null };
	setTeacherFormDialog: (value: { open: boolean; teacher: TeacherWithLessonTypes | null }) => void;
	deleteDialog: { open: boolean; teacher: TeacherWithLessonTypes } | null;
	setDeleteDialog: (value: { open: boolean; teacher: TeacherWithLessonTypes } | null) => void;
	loadTeachers: () => void;
	navigate: NavigateFunction;
	confirmDelete: () => Promise<void>;
}

export function TeachersPageDialogs({
	teacherFormDialog,
	setTeacherFormDialog,
	deleteDialog,
	setDeleteDialog,
	loadTeachers,
	navigate,
	confirmDelete,
}: TeachersPageDialogsProps) {
	return (
		<>
			<TeacherFormDialog
				open={teacherFormDialog.open}
				onOpenChange={buildTeacherFormDialogOpenChangeHandler(teacherFormDialog.teacher, setTeacherFormDialog)}
				onSuccess={(teacherUserId) => {
					loadTeachers();
					if (teacherUserId) {
						navigate(buildTeacherInfoPath(teacherUserId));
					}
				}}
				teacher={teacherFormDialog.teacher ?? undefined}
			/>

			{deleteDialog && (
				<ConfirmDeleteDialog
					open={deleteDialog.open}
					onOpenChange={(open) => !open && setDeleteDialog(null)}
					title="Docent verwijderen"
					description={
						<>
							Weet je zeker dat je <strong>{getDisplayName(deleteDialog.teacher)}</strong> wilt
							verwijderen? Deze actie kan niet ongedaan worden gemaakt.
							<p className="mt-2 text-muted-foreground">
								Alle gegevens van deze docent worden permanent verwijderd, inclusief beschikbaarheid en
								lesovereenkomsten.
							</p>
						</>
					}
					onConfirm={confirmDelete}
				/>
			)}
		</>
	);
}

export function TeachersPageCreateButton({ onCreate }: { onCreate: () => void }) {
	return (
		<Button onClick={onCreate}>
			<LuPlus className="mr-2 h-4 w-4" />
			Docent toevoegen
		</Button>
	);
}
