// Recovered from the 56.5 compiled engine: AMD module "src/core/data/states".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = {  };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/data/states: undeclared runtime require of ' + name); };
(function (e, t) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NY_AREAS=t.US_STATES=void 0,t.isValidState=function isValidState(e){return t.US_STATES.includes(e)},t.US_STATES=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],t.NY_AREAS=["Albany","Allegany","Broome","Cattaraugus","Cayuga","Chautauqua","Chemung","Chenango","Clinton","Columbia","Cortland","Delaware","Dutchess","Erie","Essex","Franklin","Fulton","Genesee","Greene","Hamilton","Herkimer","Jefferson","Lewis","Livingston","Madison","Monroe","Montgomery","Nassau","Niagara","Oneida","Onondaga","Ontario","Orange","Orleans","Oswego","Otsego","Putnam","Rensselaer","Rockland","Saratoga","Schenectady","Schoharie","Schuyler","Seneca","St. Lawrence","Steuben","Suffolk","Sullivan","Tioga","Tompkins","Ulster","Warren","Washington","Wayne","Westchester","Westchester - Yonkers","Wyoming","Yates"]})(requireDep, moduleExports);

export const US_STATES = moduleExports.US_STATES;
export const NY_AREAS = moduleExports.NY_AREAS;
export const isValidState = moduleExports.isValidState;
export default moduleExports;
