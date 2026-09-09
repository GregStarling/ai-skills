import { z } from 'zod';
import { jsonCommand } from '../json-command.js';
import { parseSelectionInput, select, qualify, createBinding, validateBinding } from '../../governance/index.js';

const bindingInput = z.object({ binding: z.unknown(), selection: z.unknown() }).strict();
const qualificationInput = z.object({ candidate_id: z.string(), selection: z.unknown() }).strict();
const resultExit = (result: unknown): number => {
  const status = (result as { status?: string }).status;
  return status === 'INVALID' ? 2 : 0;
};
export const commands = [
  jsonCommand('select', 'Choose a qualified candidate or report HOLD/escalation.', input => select(parseSelectionInput(input))),
  jsonCommand('qualify', 'Recompute candidate qualification and all-attempt economics.', input => {
    const request = qualificationInput.parse(input);
    const selection = parseSelectionInput(request.selection);
    const candidate = selection.candidates.find(c => c.candidate_id === request.candidate_id);
    if (!candidate) throw new Error('Candidate is not in the complete supplied set.');
    return qualify({ ...selection, candidate });
  }),
  jsonCommand('create-binding', 'Create a binding from independently evaluated observations.', input => createBinding(parseSelectionInput(input))),
  ...['validate-binding','status'].map(name => jsonCommand(name, 'Independently recompute a binding against its complete evidence.', input => {
    const request = bindingInput.parse(input);
    return validateBinding(request.binding, parseSelectionInput(request.selection));
  }, resultExit)),
];
