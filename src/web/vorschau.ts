/** Material that is only for the teacher: a solution sheet or a marking guide. It must not take the preview from the sheet the pupils get. */
export const nurFuerLehrkraft = (title: string) => /\(Lösung\)\s*$/i.test(title) || /^Erwartungshorizont\b/i.test(title);
