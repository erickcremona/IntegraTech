import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, precheck, factoryRoot } from './governance.mjs';
import { contained } from './paths.mjs';
export function policyConfig() {
  const policy = JSON.parse(readFileSync(new URL('policy.json', factoryRoot), 'utf8'));
  if (policy.version !== 1 || !Number.isInteger(policy.limits?.max_review_time_ms)
    || policy.limits.max_review_time_ms < 100 || policy.limits.max_review_time_ms > 600000
    || policy.limits.max_attempts !== 1) throw new Error('política inválida');
  return policy;
}
export function checkPolicy({ repo, action, agent, phase }) {
  const result = (allowed, reason_code) => ({ status: allowed ? 'allowed' : 'blocked', reason_code, requires_native_authorization: true });
  try {
    const policy = policyConfig();
    if (!Object.hasOwn(policy.actions, action)) return result(false, 'action_not_supported');
    const role = agent === 'cto' ? { kind: 'cto', read_only: false } : catalog.specialists.find(role => role.name === agent);
    if (!role || !policy.actions[action].includes(role.kind)) return result(false, 'role_not_allowed');
    if (action === 'implement' && (role.read_only || phase !== 'business')) return result(false, 'write_not_allowed');
    if (action === 'review' && !role.read_only) return result(false, 'review_must_be_read_only');
    if (action === 'adopt') {
      const project = JSON.parse(readFileSync(contained(repo, 'project.json'), 'utf8'));
      return result(project.is_model === true && phase === 'discovery', 'model_adoption_only');
    }
    if (action === 'discover' && phase !== 'discovery' || action === 'design' && phase !== 'design') return result(false, 'phase_not_allowed');
    return precheck(repo, phase).status === 'ready' ? result(true, 'scope_checks_passed') : result(false, 'phase_requirements_missing');
  } catch { return result(false, 'policy_or_state_invalid'); }
}
