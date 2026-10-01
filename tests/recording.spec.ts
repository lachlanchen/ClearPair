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
    const initial=await record.evaluate(el=>el.getBoundingClientRect().top+scrollY);
    for(let take=0;take<3;take++){
      await record.click();
      const finish=page.getByRole('button',{name:'Finish recording',exact:true});
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
      await page.getByRole('button',{name:'Assess my pronunciation',exact:true}).click();
      await expect(page.getByText('The on-device pronunciation models are still being validated. No grade is invented.',{exact:true})).toBeVisible();
      await expect(page.locator('.local-grade')).toHaveCount(0);
      expect(await record.evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(initial,0);
      await page.getByRole('button',{name:'My recording',exact:true}).click();
      await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();
    }
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.locator('.history-item')).toHaveCount(3);
    await page.reload();
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.locator('.history-item')).toHaveCount(3);
    await page.getByRole('button',{name:/^Play recording /}).first().click();
    await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();
  });
}
