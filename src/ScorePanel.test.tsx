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
 it('does not display reference similarity as a confirmed lexical score',async()=>{
  mocks.assess.mockResolvedValue({status:'matched',score:77,model:'local-pair-hybrid:v1',contrast:'english/test',unit:'phone',targetDistance:0,competitorDistance:.3,referenceVoice:'fixture',scope:'word',evidence:'sound',
   recognition:{engine:'fixture',text:'height',decision:'unknown',confidence:.5},breakdown:{wordMatch:100,pairDistinction:98,speechMs:300,referenceMs:300},
   pairFeedback:{version:'pair-feedback:v1',expected:'light',heard:'height',kind:'unconfirmed',region:'initial',targetSound:'laɪt',partnerSound:'raɪt',cue:{en:'Compare the tongue position.',zh:'比较舌头位置。'},soundMeasured:true,conflict:false}});
  render(<ScorePanel take={take()} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  const cells=[...document.querySelectorAll('.pair-score-items dd')].map(v=>v.textContent);
  expect(cells).toEqual(['—','98/100','300ms']);
  expect(screen.getByText(/Recognized words/).textContent).toContain('height');
 });
 it('explains an unresolved capture with actual words and duration instead of claiming the microphone failed',async()=>{
  mocks.assess.mockResolvedValue({status:'unscored',reason:'uncertain',diagnostics:{speechMs:260,signal:'clear',acousticState:'unaligned',wordState:'recognized',wordEngine:'hf-vosk-native:v1/en-US',wordText:'that',wordFinal:true}});
  render(<ScorePanel take={{...take(),app:'handf',word:'hat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText('260')).toBeDefined();expect(screen.getByText('that')).toBeDefined();
  expect(screen.getByText(/Speech was captured/)).toBeDefined();
  expect(screen.queryByText(/Check the microphone/)).toBeNull();
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({score:expect.objectContaining({diagnostics:expect.objectContaining({wordText:'that'})})}));
 });
 it('labels word-only points as word match and discloses a partial transcript',async()=>{
  mocks.assess.mockResolvedValue({status:'matched',score:79,model:'local-hf-native:v1',contrast:'handf/test',unit:'phone',targetDistance:0,competitorDistance:0,referenceVoice:'none',scope:'word',evidence:'word',recognition:{engine:'apple-on-device-words:v1/en-US',text:'hat',confidence:0,decision:'target',provisional:true}});
  render(<ScorePanel take={{...take(),app:'handf',word:'hat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText('Word match').closest('.local-grade')).not.toBeNull();
  expect(screen.getByText(/Provisional word recognition/)).toBeDefined();expect(screen.queryByText('Practice match')).toBeNull();
 });
 it('shows the measured unclear H/F score and useful items instead of a dead-end uncertainty message',async()=>{
  const result:ScoreResult={status:'matched',score:56,model:'local-reference-dtw:v2',contrast:'handf/hf-en/0/0/word/en-h-f:v1',unit:'phone',targetDistance:.5,competitorDistance:.51,referenceVoice:'fixture',scope:'word',
   hf:{version:'hf-segment-fft:v1',target:'h',heard:'uncertain',position:'initial',sound:51,word:78,timing:64,segmentMs:70,targetDistance:.5,competitorDistance:.51,margin:.01,cue:'uncertain'},
   breakdown:{wordMatch:78,pairDistinction:51,speechMs:340,referenceMs:400}};
  mocks.assess.mockResolvedValue(result);
  render(<ScorePanel take={{...take(),app:'handf',word:'hat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(document.querySelector('.local-grade strong')?.textContent).toContain('56');
  for(const value of ['51','78','340'])expect(screen.getByText(value)).toBeDefined();
  expect([...document.querySelectorAll('.hf-score-items dt')].map(e=>e.textContent)).toEqual(['Word match','Target sound','Speech duration']);
  expect(screen.getByText(/64\/100/).closest('details')).not.toBeNull();
  expect(screen.getByText(/Both sounds are close/)).toBeDefined();
  expect(screen.queryByText('The sound is uncertain. Compare the pair and record again.')).toBeNull();
 });
 it('never presents lexical recognition as a measured 100-point consonant',async()=>{
  const match:ScoreResult={status:'matched',score:85,model:'local-hf-hybrid:v1',contrast:'handf/hf-en/0/0/word/en-h-f:v1',unit:'phone',
   targetDistance:0,competitorDistance:0,referenceVoice:'none:word-identification-only',scope:'word',evidence:'word',
   recognition:{engine:'fixture',text:'hat',decision:'target',confidence:.95},breakdown:{wordMatch:100,pairDistinction:0,speechMs:180,referenceMs:0}};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={{...take(),app:'handf',word:'hat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText('Not measured')).toBeDefined();expect(screen.getByText(/consonant could not be measured reliably/)).toBeDefined();
 });
 it.each(['h','f'] as const)('labels /%s/ as word evidence, not fabricated acoustic points, in the same card order',async(wordSound)=>{
  const match:ScoreResult={status:'matched',score:85,model:'local-hf-native:v1',contrast:'handf/test',unit:'phone',
   targetDistance:0,competitorDistance:0,referenceVoice:'none',scope:'word',evidence:'word',
   recognition:{engine:'fixture',text:wordSound==='h'?'hat':'fat',decision:'target',confidence:.95,wordSound},
   breakdown:{wordMatch:100,pairDistinction:0,speechMs:300,referenceMs:0}};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={{...take(),app:'handf',word:match.recognition!.text}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText(`/${wordSound}/`)).toBeDefined();expect(screen.getByText('Word evidence')).toBeDefined();
  expect([...document.querySelectorAll('.hf-score-items dt')].map(e=>e.textContent)).toEqual(['Word match','Target sound','Speech duration']);
  expect(document.querySelectorAll('.hf-score-items dd')[1].textContent).toBe(`/${wordSound}/Word evidence`);
 });
 it('gives the selected F cue for a recognized opposite H word rather than claiming unclear sound',async()=>{
  mocks.assess.mockResolvedValue({status:'matched',score:10,model:'local-hf-native:v1',contrast:'handf/test',unit:'phone',targetDistance:0,competitorDistance:0,
   referenceVoice:'none',scope:'word',evidence:'word',recognition:{engine:'fixture',text:'hat',decision:'opposite',confidence:0,wordSound:'h'},
   breakdown:{wordMatch:0,pairDistinction:0,speechMs:300,referenceMs:0}});
  render(<ScorePanel take={{...take(),app:'handf',word:'fat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText(/For F, let your upper teeth/)).toBeDefined();
  expect(screen.queryByText(/The consonant is unclear/)).toBeNull();
 });
 it('shows the offline recognized word and missing-consonant coaching without a false sound label',async()=>{
  const match:ScoreResult={status:'matched',score:18,model:'local-hf-hybrid:v1',contrast:'handf/hf-en/0/0/word/en-h-f:v1',unit:'phone',
   targetDistance:0,competitorDistance:0,referenceVoice:'none:word-identification-only',scope:'word',
   recognition:{engine:'fixture',text:'at',decision:'omitted',confidence:.9},breakdown:{wordMatch:20,pairDistinction:0,speechMs:180,referenceMs:0}};
  mocks.assess.mockResolvedValue(match);
  render(<ScorePanel take={{...take(),app:'handf',word:'hat'}} busy={false} automatic tr={tr} onSaved={vi.fn()} onStorageWarning={vi.fn()}/>);await act(async()=>{});
  expect(screen.getByText(/Recognized words/).textContent).toContain('at');expect(screen.getByText(/consonant is missing/)).toBeDefined();
  expect(screen.queryByText(/Heard/)).toBeNull();expect(screen.getByText(/not a pronunciation accuracy percentage/)).toBeDefined();
 });
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
 it('preserves a failed H/F assessment alongside its original recording, without inventing a grade',async()=>{
  const entry={...take(),app:'handf' as const,lesson:'hf-en',word:'hat'},saved=vi.fn();
  mocks.assess.mockResolvedValue({status:'unscored',reason:'sound-unresolved'});
  render(<ScorePanel take={entry} busy={false} automatic tr={tr} onSaved={saved} onStorageWarning={vi.fn()}/>);
  await act(async()=>{});
  expect(mocks.save).toHaveBeenCalledWith({...entry,score:{status:'unscored',reason:'sound-unresolved'}});
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({audio:entry.audio,score:{status:'unscored',reason:'sound-unresolved'}}));
  expect(document.querySelector('.local-grade')).toBeNull();
 });
});
