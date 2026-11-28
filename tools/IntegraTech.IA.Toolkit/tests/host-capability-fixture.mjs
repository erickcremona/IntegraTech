import {symlinkCapability} from '../scripts/lib/host-capabilities.mjs';

export function symlinkTest(test,name,optionsOrFn,maybeFn){
 const options=typeof optionsOrFn==='function'?{}:optionsOrFn??{};
 const fn=typeof optionsOrFn==='function'?optionsOrFn:maybeFn;
 const capability=symlinkCapability();
 const skip=capability.status==='unavailable'?`${capability.reason_code} (${capability.error_code}); host must permit directory junctions/symlinks to execute this security oracle.`:options.skip;
 return test(name,{...options,...(skip?{skip}: {})},fn);
}
