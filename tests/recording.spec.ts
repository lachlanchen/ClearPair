import {test,expect} from '@playwright/test';

// A generated browser stream verifies capture/storage/lifecycle, not pronunciation
// accuracy, a real microphone, or a native permission dialog.
for(const id of ['handf','landr','english','chinese','korean','arabic','cantonese','japanese']) {
  test(`${id}: repeated capture, fixed controls, waveform, and retained history`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.addInitScript(()=>{
      navigator.mediaDevices.getUserMedia=async()=>{
        const context=new AudioContext(),destination=context.createMediaStreamDestination();
        const source=context.createOscillator(),gain=context.createGain();
        source.frequency.value=180;gain.gain.value=.1;
        source.connect(gain);gain.connect(destination);source.start();await context.resume();
        const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);
        track.stop=()=>{source.stop();void context.close();stop();};
        return destination.stream;
      };
    });
    await page.goto(`/${id}/`);
    await page.getByRole('button',{name:'Practise',exact:true}).click();
    const record=page.getByRole('button',{name:'Record your voice',exact:true});
    await expect(page.locator('.intro')).toHaveCount(0);
    await expect(page.locator('.timer')).toBeEmpty();
    expect(await page.locator('.record-controls').evaluate(e=>e.nextElementSibling?.className)).toBe('local-score-panel');
    await record.scrollIntoViewIfNeeded();
    expect(await record.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
    const initial=await record.evaluate(el=>el.getBoundingClientRect().top+scrollY);
    await page.screenshot({path:`.runtime/screenshots/${id}-practice8-idle.png`});
    for(let take=0;take<3;take++){
      await record.click();
      const finish=page.getByRole('button',{name:'Stop and score',exact:true});
      await expect(finish).toBeVisible();
      await expect(page.getByRole('button',{name:'Next word pair'})).toBeDisabled();
      await expect.poll(()=>page.locator('.waveform line').evaluateAll(lines=>
        lines.some(line=>line.getAttribute('y1')!==line.getAttribute('y2')))).toBe(true);
      await page.waitForTimeout(300);
      expect(await finish.evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(initial,0);
      await finish.click();
      await expect(page.getByText('Saved on device',{exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'My recording',exact:true})).toBeEnabled();
      expect(await record.evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(initial,0);
      await expect(page.getByRole('button',{name:'Assess my pronunciation',exact:true})).toHaveCount(0);
      await expect(page.getByText('The on-device pronunciation models are still being validated. No grade is invented.',{exact:true})).toBeVisible();
      await expect(page.locator('.local-grade')).toHaveCount(0);
      expect(await record.evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(initial,0);
      await page.getByRole('button',{name:'My recording',exact:true}).click();
      await expect(page.locator('.playback-dock')).not.toBeVisible();
    }
    await page.screenshot({path:`.runtime/screenshots/${id}-practice8-take.png`});
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.locator('.history-item')).toHaveCount(3);
    await page.reload();
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.locator('.history-item')).toHaveCount(3);
    await page.getByRole('button',{name:/^Play recording /}).first().click();
    await expect(page.locator('.playback-dock')).not.toBeVisible();
  });
}
for(const id of ['handf','landr','english','chinese','korean','arabic','cantonese','japanese'])test(`${id}: speech then silence stops and assesses automatically on repeated takes`,async({page})=>{
 await page.addInitScript(()=>{
  navigator.mediaDevices.getUserMedia=async()=>{
   const context=new AudioContext(),destination=context.createMediaStreamDestination();
   const source=context.createOscillator(),gain=context.createGain();source.frequency.value=180;
   source.connect(gain);gain.connect(destination);await context.resume();
   // ~0.009 RMS: an immediate soft word must not be learned as noise.
   gain.gain.setValueAtTime(.013,context.currentTime);gain.gain.setValueAtTime(0,context.currentTime+.5);source.start();
   const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);
   track.stop=()=>{source.stop();void context.close();stop();};return destination.stream;
  };
 });
 await page.goto(`/${id}/`);await page.getByRole('button',{name:'Practise',exact:true}).click();
 const record=page.getByRole('button',{name:'Record your voice',exact:true});
 const top=await record.evaluate(el=>el.getBoundingClientRect().top+scrollY);
 for(let i=0;i<2;i++){
  await record.click();await expect(page.getByRole('button',{name:'Stop and score',exact:true})).toBeVisible();
  await expect(page.getByText('Saved on device',{exact:true})).toBeVisible({timeout:10000});
  await expect(page.getByText('The on-device pronunciation models are still being validated. No grade is invented.',{exact:true})).toBeVisible();
  expect(await record.evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(top,0);
 }
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-item')).toHaveCount(2);
});
