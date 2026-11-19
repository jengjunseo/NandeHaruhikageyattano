const {test,expect}=require('@playwright/test');
const v53=require('../fixtures/v53-save-samples.json');
const start=async page=>{await page.goto('/');await expect(page.locator('[data-title-action=start]')).toBeEnabled();await page.getByRole('button',{name:'시작하기 NEW GAME',exact:true}).click();await expect(page.locator('#vnStage')).toBeVisible();};
const skip=async page=>{await page.locator('#vnMenuToggle').click();await page.locator('#vnSkip').click();await expect(page.locator('[data-week=open]')).toBeVisible();};
test('new game, first order, direct serve, automation and pause',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await start(page);await skip(page);await page.locator('[data-week=open]').click();await page.locator('#panel [data-make]').first().click();await page.locator('#panel [data-serve]').first().click();await expect(page.locator('#workStatus')).not.toContainText('전달 중');
 await page.locator('#workModeQuick').click();await expect(page.locator('#operations')).toHaveAttribute('open','');await page.locator('#priority').selectOption('make');await page.locator('#simSpeed').selectOption('2');await page.locator('#pauseBtn').click();await expect(page.locator('#clock')).toContainText('일시정지');await page.locator('#pauseBtn').click();await expect(page.locator('#workModeQuick')).toContainText('제조 우선');expect(errors).toEqual([]);
});
test('dialogue slot save, reload and load preserve the exact line',async({page})=>{
 await start(page);await page.locator('#vnMenuToggle').click();await page.locator('#vnSpeed').selectOption('0');await page.locator('#vnMenuToggle').click();await page.locator('#vnStage').press('Enter');const line=await page.locator('#vnText').innerText();await page.locator('#vnMenuToggle').click();await page.locator('#vnSave').click();await page.locator('[data-slot="0"]').click();await expect(page.locator('#titleFeedback')).toContainText('저장했습니다');await page.reload();await page.getByRole('button',{name:'이어하기 CONTINUE',exact:true}).click();await expect(page.locator('#vnText')).toHaveText(line);await page.locator('#vnMenuToggle').click();await page.locator('#vnLoad').click();await page.locator('[data-slot="0"]').click();await page.locator('#titleConfirm').click();await expect(page.locator('#vnText')).toHaveText(line);
});
test('temporary optimized-art failure can recover without resetting progress',async({page})=>{
 let broken=true,attempts=0;await page.route('**/assets/optimized/cafe-v52*.webp*',route=>{attempts++;return broken?route.abort():route.continue();});await page.goto('/');await expect(page.locator('[data-title-action=start]')).toBeEnabled();await expect(page.locator('#titleLoad')).toContainText('대체');broken=false;await page.getByRole('button',{name:'설정 SETTINGS',exact:true}).click();await page.getByRole('button',{name:'장면 이미지 다시 준비',exact:true}).click();await expect(page.locator('#titleFeedback')).toContainText('이미지 복구');expect(attempts).toBeGreaterThan(1);
});
test('music control and story tab remain separate across review viewports',async({page})=>{
 await start(page);await skip(page);await page.locator('[data-week=prepare]').click();for(const [width,height]of [[360,800],[390,844],[430,932],[844,390],[768,1024],[1366,768]]){await page.setViewportSize({width,height});const music=await page.locator('.header-tools .music-drawer summary').boundingBox(),story=await page.locator('nav [data-tab=story]').boundingBox();expect(music&&story).toBeTruthy();const overlap=music.x<story.x+story.width&&music.x+music.width>story.x&&music.y<story.y+story.height&&music.y+music.height>story.y;expect(overlap).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.locator('nav [data-tab=story]').click();await expect(page.locator('#panel')).toContainText('이야기');
});
test('corrupt automatic accounting preserves the raw record and offers recovery',async({page})=>{
 await start(page);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('project-ring-phase1-v1'))).not.toBeNull();
 const raw=await page.evaluate(()=>localStorage.getItem('project-ring-phase1-v1'));
 await page.evaluate(raw=>{const s=JSON.parse(raw);s.accounting={};localStorage.setItem('project-ring-phase1-v1:last-good',raw);localStorage.setItem('project-ring-phase1-v1',JSON.stringify(s));},raw);
 await page.reload();
 await expect(page.locator('[data-title-action=continue]')).toBeDisabled();
 await expect(page.locator('#titleRecovery')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('project-ring-phase1-v1')).accounting)).toEqual({});
 await page.locator('#titleRecovery').click();
 await expect(page.locator('#titleRestorePrevious')).toBeEnabled();
 await page.locator('#titleRestorePrevious').click();await page.locator('#titleConfirm').click();
 await expect(page.locator('[data-title-action=continue]')).toBeEnabled();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('project-ring-phase1-v1:damaged')).accounting)).toEqual({});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('project-ring-phase1-v1')).accounting)).toEqual(JSON.parse(raw).accounting);
});

test('unpaid stock stays in preparation, paid stock can open directly',async({page})=>{
 await start(page);await skip(page);await page.locator('[data-week=prepare]').click();
 await page.getByRole('spinbutton',{name:'커피 원두 주문 수량'}).fill('1');
 await page.locator('#weekOpenFromPrep').click();
 await expect(page.locator('#panel')).toContainText('미결제 발주');
 await expect(page.locator('#clock')).toContainText('영업 준비');
 await page.locator('#weekBasketPay').click();await page.locator('#weekOpenFromPrep').click();
 await expect(page.locator('#clock')).toContainText('영업 중');
 await expect(page.locator('#panel [data-make]')).toHaveCount(1);
});

test('v53 receipt marks a menu for the following morning',async({page})=>{
 await page.addInitScript(save=>{
  if(!localStorage.getItem('project-ring-phase1-v1')) localStorage.setItem('project-ring-phase1-v1',JSON.stringify(save));
 },v53.closed);
 await page.goto('/');
 await page.locator('[data-title-action=continue]').click();
 await expect(page.locator('.week-receipt')).toContainText('블렌드 커피 · ¥480에 1건 이탈');
 await page.locator('#weekPlanTomorrow').click();
 await expect(page.locator('.week-receipt')).toContainText('DAY 1');
 await page.locator('#tomorrow').click();
 await expect(page.locator('#vnStage')).toBeVisible();
 await page.locator('#vnMenuToggle').click();await page.locator('#vnSkip').click();
 await expect(page.locator('[data-prep-menu=coffee]')).toBeFocused();
 await expect(page.locator('#stats')).toContainText('DAY 2');
});

test('concert reserves two portions, shown on the first service screen',async({page})=>{
 const save=JSON.parse(JSON.stringify(v53.prep));
 save.day=3;
 await page.addInitScript(save=>localStorage.setItem('project-ring-phase1-v1',JSON.stringify(save)),save);
 await page.goto('/');await page.locator('[data-title-action=continue]').click();
 await page.getByRole('button',{name:'공연 세트 준비',exact:true}).click();
 await page.getByRole('button',{name:'공연용 2인분 확보',exact:true}).click();
 await expect(page.locator('.service-plan')).toContainText('현재 2인분 확보 가능');
 await page.locator('[data-prep=stock]').click();
 await expect(page.locator('#weekBasket')).toContainText('공연 확보 목표 2');
 await page.locator('#weekOpenFromPrep').click();
 await expect(page.locator('.week-scene-status')).toContainText('재료 확보 2인분');
});

test('stock checkout is reachable on portrait and landscape without scrolling the drawer',async({page})=>{
 await start(page);await skip(page);
 for (const [width,height] of [[375,812],[812,375]]) {
  await page.setViewportSize({width,height});
  await page.locator('[data-week=prepare]').click();
  for (const id of ['#weekBasketPay','#weekOpenFromPrep']) {
   const usable=await page.locator(id).evaluate(el=>{
    const r=el.getBoundingClientRect();
    return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
   });
   expect(usable,id+' '+width+'x'+height).toBe(true);
  }
  await page.locator('#cafeClosePanel').click();
 }
});
