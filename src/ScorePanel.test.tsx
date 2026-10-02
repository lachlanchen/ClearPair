import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Take} from './types';
import type {ScoreResult} from './scoring';
const mocks=vi.hoisted(()=>({assess:vi.fn(),cancel:vi.fn(),save:vi.fn()}));
vi.mock('./local-score',()=>({LocalScorer:class {assess=mocks.assess;cancel=mocks.cancel;dispose=mocks.cancel;}}));
vi.mock('./storage',()=>({saveTake:mocks.save}));
import {ScorePanel} from './ScorePanel';
const tr=(en:string)=>en;
function take(id='one'):Take{return {id,app:'english',lesson:'en-th-s',word:'thin',prompt:'thin',language:'en-US',
 createdAt:1,mimeType:'audio/wav',audio:new Blob(['test']),analysis:{seconds:1,rms:.1,peak:.2,clipped:0,voicedSeconds:.8,waveform:[],pitch:[],status:'clear'},
 assessment:{pair:0,side:0,sentence:false}};}
const deferred=()=>{let resolve!:(value:ScoreResult)=>void;const promise=new Promise<ScoreResult>(r=>{resolve=r;});return {promise,resolve};};
const grade:ScoreResult={status:'scored',score:83,probability:.83,model:'test-only',contrast:'english/test-only',unit:'phone'};
beforeEach(()=>{vi.clearAllMocks();mocks.save.mockResolvedValue('device');});
afterEach(cleanup);
describe('local scoring take lifecycle',()=>{
 it('shows useful measured items outside the collapsed technical details',async()=>{
  const match:ScoreResult={status:'matched',score:72,model:'local-reference-dtw:v1',contrast:'english/test',unit:'phone',targetDistance:.3,competitorDistance:.7,referenceVoice:'fixture',scope:'word',breakdown:{wordMatch:83,pairDistinction:91,speechMs:220,referenceMs:310}};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={take()} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  for(const label of ['Word match','Pair distinction','Speech duration'])expect(screen.getByText(label).closest('details')).toBeNull();
  expect(screen.getByText('220')).toBeDefined();expect(document.querySelector('details')?.open).toBe(false);
 });
 it.each([['initial','Initial contrast'],['final','Ending contrast'],['vowel','Vowel contrast']] as const)('names the measured %s region without adding another panel',async(region,label)=>{
  const match:ScoreResult={status:'matched',score:72,model:'local-reference-dtw:v2',contrast:'english/test',unit:'phone',
   targetDistance:.3,competitorDistance:.7,referenceVoice:'fixture',scope:'word',
   focus:{version:'pair-focus-dtw:v1',region,targetDistance:.2,competitorDistance:.7,separation:.5,frames:8},
   breakdown:{wordMatch:83,pairDistinction:91,speechMs:220,referenceMs:310}};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={take()} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText(label).closest('dl')).not.toBeNull();expect(screen.queryByText('Pair distinction')).toBeNull();
 });
 it('shows opposite-word feedback without claiming a detected phoneme and keeps details collapsed',async()=>{
  const match:ScoreResult={status:'matched',score:28,model:'local-reference-dtw:v1',contrast:'handf/hf-en/0/0/word/en-h-f:v1',unit:'phone',targetDistance:.9,competitorDistance:.2,referenceVoice:'fixture',scope:'word',closestWord:'fat',evidence:'word'};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={take()} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);
  await act(async()=>{});
  expect(screen.getByText(/Closer to/).textContent).toContain('fat');
  expect(document.querySelector('details')?.open).toBe(false);
  expect(screen.queryByText(/Heard/)).toBeNull();
 });
 it('automatically assesses a finished H & F take once, without an Assess button',async()=>{
  const entry={...take(),app:'handf' as const,lesson:'hf-en',word:'hat',prompt:'hat'},saved=vi.fn();
  mocks.assess.mockResolvedValue(grade);
  const view=render(<ScorePanel take={entry} busy automatic tr={tr} onSaved={saved} onStorageWarning={vi.fn()}/>);
  expect(mocks.assess).not.toHaveBeenCalled();
  await act(async()=>view.rerender(<ScorePanel take={entry} busy={false} automatic tr={tr} onSaved={saved} onStorageWarning={vi.fn()}/>));
  expect(mocks.assess).toHaveBeenCalledTimes(1);expect(screen.queryByRole('button',{name:'Assess my pronunciation'})).toBeNull();
  await act(async()=>view.rerender(<ScorePanel take={{...entry,score:grade}} busy={false} automatic tr={tr} onSaved={saved} onStorageWarning={vi.fn()}/>));
  expect(mocks.assess).toHaveBeenCalledTimes(1);
 });
 it('cancels automatic scoring when the next recording begins',async()=>{
  const pending=deferred(),saved=vi.fn();mocks.assess.mockReturnValue(pending.promise);
  const props={take:{...take(),app:'handf' as const},busy:false,automatic:true,tr,onSaved:saved,onStorageWarning:vi.fn()};
  const view=render(<ScorePanel {...props}/>);expect(mocks.assess).toHaveBeenCalledTimes(1);
  view.rerender(<ScorePanel {...props} busy/>);
  await act(async()=>pending.resolve(grade));expect(saved).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 });
 it('offers retry after an automatic attempt is interrupted by backgrounding',async()=>{
  const pending=deferred();mocks.assess.mockReturnValue(pending.promise);
  const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(false);
  render(<ScorePanel take={take()} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);
  expect(mocks.assess).toHaveBeenCalledTimes(1);
  hidden.mockReturnValue(true);fireEvent(document,new Event('visibilitychange'));
  hidden.mockReturnValue(false);fireEvent(document,new Event('visibilitychange'));
  expect(screen.getByRole('button',{name:'Retry scoring'})).toBeDefined();
  hidden.mockRestore();
 });
 it('labels experimental reference matches and preserves their provenance in history',async()=>{
  const match:ScoreResult={status:'matched',score:76,model:'local-reference-dtw:v1',contrast:'handf/hf-en/0/0/word/en-h-f:v1',unit:'phone',targetDistance:.2,competitorDistance:.3,referenceVoice:'fixture',scope:'word'};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={take()} busy={false} tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Assess my pronunciation'})));
  expect(screen.getByText(/not a pronunciation accuracy percentage/)).toBeDefined();
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({score:match}));
 });
 it('disables assessment without a frozen target, including old history entries',()=>{
  const old=take();delete old.assessment;
  render(<ScorePanel take={old} busy={false} tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/Recorded word/).textContent).toContain('thin');
 });
 it('uses the recorded target and never substitutes the current card',async()=>{
  const entry=take(),saved=vi.fn();mocks.assess.mockResolvedValue(grade);
  render(<ScorePanel take={entry} busy={false} tr={tr} onSaved={saved} onStorageWarning={vi.fn()}/>);
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Assess my pronunciation'})));
  expect(mocks.assess).toHaveBeenCalledWith('english','en-th-s',0,0,false,entry.audio,
   {word:'thin',spokenPrompt:'thin',calibrationKey:undefined});
  expect(mocks.save).toHaveBeenCalledWith({...entry,score:grade});
  expect(saved).toHaveBeenCalledWith({...entry,score:grade,storage:'device'});
 });
 it.each(['changed-take','started-recording','unmounted','stop'] as const)('ignores a delayed result after %s',async(action)=>{
  const pending=deferred(),saved=vi.fn();mocks.assess.mockReturnValue(pending.promise);
  const props={take:take(),busy:false,tr,onSaved:saved,onStorageWarning:vi.fn()},view=render(<ScorePanel {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Assess my pronunciation'}));
  expect(screen.getByRole('button',{name:'Stop'})).toBeDefined();
  if(action==='changed-take')view.rerender(<ScorePanel {...props} take={{...take('two'),word:'sink'}}/>);
  if(action==='started-recording')view.rerender(<ScorePanel {...props} busy/>);
  if(action==='unmounted')view.unmount();
  if(action==='stop')fireEvent.click(screen.getByRole('button',{name:'Stop'}));
  await act(async()=>{pending.resolve(grade);await pending.promise;});
  expect(saved).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.cancel).toHaveBeenCalled();
 });
 it('keeps unavailable and uncertain results ungraded and does not overwrite history',async()=>{
  mocks.assess.mockResolvedValue({status:'unscored',reason:'unvalidated-model'});
  render(<ScorePanel take={take()} busy={false} tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Assess my pronunciation'})));
  expect(screen.getByText(/No grade is invented/)).toBeDefined();expect(mocks.save).not.toHaveBeenCalled();
  expect(document.querySelector('.local-grade')).toBeNull();
 });
});
