import {HfWordRuntime} from './hf-word-runtime';
import manifest from '../models/pair-words.json';
/** Separate configuration: H/F's production decoder and hybrid are unchanged. */
export class PairWordRuntime extends HfWordRuntime {
 constructor(){super(undefined,{...manifest,nativeAndroid:true});}
}
