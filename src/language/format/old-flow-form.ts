// Each branch of the old form closed itself: </IF><ELSEIF ...></ELSEIF><ELSE></ELSE>.
// The new form never has a closing branch tag, so one in the markup means the old form.
const OLD_BRANCH_CLOSE = /<\/(ELSEIF|ELSE)\s*>/;
const CLOSE_BEFORE_BRANCH = /<\/(IF|ELSEIF)\s*>(?=\s*<ELSE(?:IF)?[\s>])/g;
const BRANCH_CLOSE = /<\/(ELSEIF|ELSE)\s*>/g;

/** Rewrites the old form to the new one, where one </IF> closes the whole chain. */
export function convertOldFlowForm(markup: string): string {
  if (!OLD_BRANCH_CLOSE.test(markup)) return markup;
  return markup.replace(CLOSE_BEFORE_BRANCH, "").replace(BRANCH_CLOSE, "</IF>");
}
