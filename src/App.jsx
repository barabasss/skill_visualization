import { useState, useEffect, useRef } from "react";

const USER_MSG = "Сгенерируй release notes за последний спринт";

const SKILL_MD = `---
name: release-notes
description: Generate release notes from
  commits, enrich with ticket details
---

# Release Notes Skill

## Шаги
1. Получить лог коммитов → git log
2. Получить детали тикетов
   → читай jira_integration.md
3. Загрузить шаблон → release_template.md
4. Сгенерировать release notes
5. Опубликовать → bash publish_release.sh`;

const SKILL_MD_S1 = `---
name: release-notes
description: Generate release notes from
  commits, enrich with ticket details
---

# Release Notes Skill

## Шаги
1. Получить лог коммитов → git log  ◀
2. Получить детали тикетов
   → читай jira_integration.md
3. Загрузить шаблон → release_template.md
4. Сгенерировать release notes
5. Опубликовать → bash publish_release.sh`;

const SKILL_MD_D1 = `---
name: release-notes
description: Generate release notes from
  commits, enrich with ticket details
---

# Release Notes Skill

## Шаги
1. Получить лог коммитов → git log  ✅
2. Получить детали тикетов           ◀
   → читай jira_integration.md
3. Загрузить шаблон → release_template.md
4. Сгенерировать release notes
5. Опубликовать → bash publish_release.sh`;

const GIT_LOG = `a3f21c4 PROJ-142 feat: add user avatar upload
b8e0917 PROJ-138 fix: token expiry on refresh
c44d1a2 PROJ-155 feat: dark mode support
d991ef3 PROJ-149 fix: pagination offset
e12ab78 PROJ-160 feat: export to CSV

 5 commits (PROJ-142, 138, 155, 149, 160)`;

const JIRA_MD = `# Jira Integration

## API
Endpoint: https://team.atlassian.net/rest/api/3
Auth: Bearer $JIRA_TOKEN

## Получение тикетов
1. Извлечь ID из коммитов (PROJ-\\d+)
2. GET /issue/{id}?fields=summary,issuetype
3. Маппинг: Story→Feature, Bug→Fix`;

const TICKETS_RESULT = `PROJ-142  Story  «Загрузка аватара пользователя»
PROJ-138  Bug    «Токен истекает при refresh»
PROJ-155  Story  «Поддержка тёмной темы»
PROJ-149  Bug    «Неверный offset пагинации»
PROJ-160  Story  «Экспорт данных в CSV»`;

const FINAL_ANSWER = `✅ Release Notes готовы!

# Release v2.4.0 — 18.04.2026

✨ Avatar upload, Dark mode, CSV export
🐛 Token expiry fix, Pagination fix`;

const RELEASE_TPL = `# Release {{version}} — {{date}}

## ✨ New Features
{{features}}

## 🐛 Bug Fixes
{{fixes}}`;

const SD = {n:"skill descriptions",c:"#94a3b8"};

const STEPS = [
  { id:0, label:"Начало", badge:null, pct:0.1, ctx:[SD], msgs:[], think:null,
    tree:false, hl:false, fc:null, fn:null, panel:"reg", hlFile:null },
  { id:1, label:"Пользователь отправляет запрос", badge:"user", pct:0.7,
    ctx:[SD,{n:"prompt",c:"#10b981"}],
    msgs:[{r:"user",t:USER_MSG}],
    think:null, tree:false, hl:false, fc:null, fn:null, panel:"reg", hlFile:null },
  { id:2, label:"Агент ищет подходящий скилл", badge:"thinking", pct:0.7,
    ctx:[SD,{n:"prompt",c:"#10b981"}],
    msgs:[{r:"user",t:USER_MSG}],
    think:"Пользователь хочет release notes…\nИщу среди описаний скиллов в контексте…\n\nСкилл «release-notes» — подходит!",
    tree:false, hl:true, fc:null, fn:null, panel:"reg", hlFile:null },
  { id:3, label:"Загрузка SKILL.md", badge:"tool", pct:3.3,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"}],
    think:null, tree:true, hl:true, fc:SKILL_MD, fn:"SKILL.md", panel:"skill", hlFile:null },
  { id:4, label:"Агент читает инструкцию", badge:"thinking", pct:3.3,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"}],
    think:"Из SKILL.md вижу план:\n  Шаг 1 → git log\n  Шаг 2 → тикеты (jira_integration.md)\nВыполняю шаг 1…",
    tree:true, hl:true, fc:SKILL_MD_S1, fn:"SKILL.md", panel:"skill", hlFile:null },
  { id:5, label:"Получение лога коммитов", badge:"tool", pct:3.8,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"}],
    think:null, tree:true, hl:true, fc:GIT_LOG, fn:"git log", panel:"file", hlFile:null },
  { id:6, label:"Агент видит ссылку на jira_integration.md", badge:"thinking", pct:3.8,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"}],
    think:"✅ Шаг 1 — лог получен, вижу тикеты.\n\nШаг 2: «Получить детали тикетов\n→ читай jira_integration.md»\n\nSKILL.md ссылается на другой файл!\nЗагружаю…",
    tree:true, hl:true, fc:SKILL_MD_D1, fn:"SKILL.md", panel:"skill", hlFile:"jira_integration.md" },
  { id:7, label:"Загрузка jira_integration.md", badge:"tool", pct:5.8,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"}],
    think:null, tree:true, hl:true, fc:JIRA_MD, fn:"jira_integration.md", panel:"file", hlFile:"jira_integration.md" },
  { id:8, label:"Запрос тикетов из Jira", badge:"tool", pct:6.3,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"}],
    think:null, tree:true, hl:true, fc:TICKETS_RESULT, fn:"Jira API response", panel:"file", hlFile:null },
  { id:9, label:"Агент переходит к шаблону", badge:"thinking", pct:6.3,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"}],
    think:"✅ Шаг 2 — тикеты получены.\n\nШаг 3 по SKILL.md:\n«Загрузить шаблон → release_template.md»\n\nЗагружаю…",
    tree:true, hl:true, fc:null, fn:null, panel:"skill", hlFile:null },
  { id:10, label:"Загрузка шаблона release notes", badge:"tool", pct:6.6,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"},{n:"release_template",c:"#14b8a6"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"},{r:"tool",t:"view release_template.md"}],
    think:null, tree:true, hl:true, fc:RELEASE_TPL, fn:"release_template.md", panel:"file", hlFile:null },
  { id:11, label:"Агент запускает публикацию", badge:"thinking", pct:6.6,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"},{n:"release_template",c:"#14b8a6"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"},{r:"tool",t:"view release_template.md"}],
    think:"✅ Шаги 3–4 выполнены — notes готовы.\n\nШаг 5 по SKILL.md:\n«Опубликовать → bash publish_release.sh»\n\nСкрипт не читаю, просто запускаю →",
    tree:true, hl:true, fc:null, fn:null, panel:"skill", hlFile:null },
  { id:12, label:"Публикация release notes", badge:"tool", pct:6.6,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"},{n:"release_template",c:"#14b8a6"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"},{r:"tool",t:"view release_template.md"},{r:"tool",t:"bash publish_release.sh v2.4.0"}],
    think:null, tree:true, hl:true, fc:"$ bash publish_release.sh v2.4.0\n\n✓ Release notes saved to RELEASES.md\n✓ Git tag v2.4.0 created\n✓ Published to Confluence\n\nDone in 2.3s", fn:"stdout", panel:"file", hlFile:null },
  { id:13, label:"Release notes готовы!", badge:"done", pct:7.6,
    ctx:[SD,{n:"prompt",c:"#10b981"},{n:"SKILL.md",c:"#f59e0b"},{n:"git log",c:"#ec4899"},{n:"jira_integration.md",c:"#8b5cf6"},{n:"jira resp",c:"#f97316"},{n:"release_template",c:"#14b8a6"},{n:"ответ",c:"#06b6d4"}],
    msgs:[{r:"user",t:USER_MSG},{r:"tool",t:"view /skills/release-notes/SKILL.md"},{r:"tool",t:"bash git log --oneline v2.3.0..HEAD"},{r:"tool",t:"view jira_integration.md"},{r:"tool",t:"GET /rest/api/3/issue/PROJ-{142,138,155,149,160}"},{r:"tool",t:"view release_template.md"},{r:"tool",t:"bash publish_release.sh v2.4.0"},{r:"assistant",t:FINAL_ANSWER}],
    think:null, tree:true, hl:true, fc:null, fn:null, panel:"done", hlFile:null },
];

const SKILL_TREE = [
  { name:"skills/", type:"folder", depth:0 },
  { name:"release-notes/", type:"folder", depth:1, highlight:true },
  { name:"SKILL.md", type:"file", depth:2, main:true },
  { name:"jira_integration.md", type:"file", depth:2 },
  { name:"release_template.md", type:"file", depth:2 },
  { name:"publish_release.sh", type:"file", depth:2 },
];

function TW({ text, speed=18 }) {
  const [d,setD]=useState("");
  useEffect(()=>{setD("");let i=0;const iv=setInterval(()=>{i++;setD(text.slice(0,i));if(i>=text.length)clearInterval(iv);},speed);return()=>clearInterval(iv);},[text,speed]);
  return <>{d}</>;
}

const B = {
  user:{bg:"#dcfce7",fg:"#166534",l:"👤 User"},
  thinking:{bg:"#fef3c7",fg:"#92400e",l:"💭 Thinking"},
  tool:{bg:"#ede9fe",fg:"#5b21b6",l:"⚙ Tool Call"},
  done:{bg:"#cffafe",fg:"#155e75",l:"✅ Done"},
};

export default function App() {
  const [si,setSi]=useState(0);
  const s=STEPS[si];
  const ref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[si]);

  return (
    <div style={{height:"100vh",background:"#f8fafc",fontFamily:"'IBM Plex Sans',-apple-system,sans-serif",color:"#0f172a",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* STEP BAR — compact single line */}
      <div style={{
        padding:"8px 20px",height:36,
        background:s.badge?B[s.badge].bg:"#f1f5f9",
        borderBottom:"1px solid #e2e8f0",
        display:"flex",alignItems:"center",gap:8,flexShrink:0,
        transition:"background 0.3s ease",
      }}>
        <span style={{fontSize:11,fontWeight:700,color:s.badge?B[s.badge].fg:"#64748b"}}>
          {s.badge?B[s.badge].l:"⏳ Готов"}
        </span>
        <span style={{fontSize:12,fontWeight:600,color:"#334155"}}>— {s.label}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{width:i===si?14:5,height:5,borderRadius:3,background:i<=si?"#6366f1":"#d4d4d4",transition:"all .3s ease"}}/>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="main-row" style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

        {/* CHAT */}
        <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:"1px solid #e2e8f0",background:"#fff",minWidth:0}}>
          <div style={{flex:1,overflowY:"auto",padding:"12px 18px",display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:760,margin:"0 auto"}}>
            {si===0&&(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#cbd5e1",fontSize:13}}>
                Нажмите «Далее» →
              </div>
            )}
            {s.msgs.map((m,i)=>{
              const isNew=i===s.msgs.length-1;
              const anim=isNew?"slideUp .3s ease":undefined;
              if(m.r==="user") return(
                <div key={i} style={{alignSelf:"flex-end",maxWidth:"80%",animation:anim}}>
                  <div style={{fontSize:9,color:"#10b981",fontWeight:700,marginBottom:2,textAlign:"right"}}>ПОЛЬЗОВАТЕЛЬ</div>
                  <div style={{background:"#10b981",color:"#fff",borderRadius:"14px 14px 3px 14px",padding:"8px 14px",fontSize:13,lineHeight:1.4}}>{m.t}</div>
                </div>
              );
              if(m.r==="tool") return(
                <div key={i} style={{alignSelf:"flex-start",maxWidth:"90%",animation:anim}}>
                  <div style={{fontSize:9,color:"#7c3aed",fontWeight:700,marginBottom:2}}>⚙ TOOL CALL</div>
                  <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:"3px 12px 12px 12px",padding:"5px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"#5b21b6"}}>{m.t}</div>
                </div>
              );
              if(m.r==="assistant") return(
                <div key={i} style={{alignSelf:"flex-start",maxWidth:"85%",animation:anim}}>
                  <div style={{fontSize:9,color:"#0891b2",fontWeight:700,marginBottom:2}}>АГЕНТ</div>
                  <div style={{background:"#ecfeff",border:"1px solid #cffafe",borderRadius:"3px 14px 14px 14px",padding:"8px 14px",fontSize:12,lineHeight:1.5,whiteSpace:"pre-line",color:"#155e75"}}>{m.t}</div>
                </div>
              );
              return null;
            })}
            {s.think&&(
              <div style={{alignSelf:"flex-start",maxWidth:"85%",animation:"slideUp .3s ease"}}>
                <div style={{fontSize:9,color:"#d97706",fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{animation:"pulse 1.2s infinite"}}>💭</span> THINKING
                </div>
                <div style={{background:"#fffbeb",border:"1px dashed #fcd34d",borderRadius:"3px 14px 14px 14px",padding:"8px 14px",fontSize:12,lineHeight:1.6,color:"#92400e",whiteSpace:"pre-line"}}>
                  <TW text={s.think}/>
                </div>
              </div>
            )}
            <div ref={ref}/>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-col" style={{flex:"0 1 440px",minWidth:220,display:"flex",flexDirection:"column",background:"#fafbfc",overflow:"auto"}}>

          {/* Context */}
          <div style={{padding:"10px 12px 8px",borderBottom:"1px solid #e2e8f0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
              <span style={{fontSize:9,fontWeight:700,color:"#64748b"}}>CONTEXT WINDOW</span>
              <span style={{fontSize:16,fontWeight:800,color:"#334155",fontVariantNumeric:"tabular-nums"}}>{s.pct.toFixed(1)}%</span>
            </div>
            <div style={{height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden",border:"1px solid #e2e8f0"}}>
              <div style={{height:"100%",width:`${Math.min(s.pct,100)}%`,background:"linear-gradient(90deg,#6366f1,#a78bfa)",borderRadius:2,transition:"width .6s ease"}}/>
            </div>
            {s.ctx.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:"2px 10px",marginTop:5}}>
                {s.ctx.map(it=>(
                  <div key={it.n} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#64748b"}}>
                    <div style={{width:6,height:6,borderRadius:1,background:it.c}}/>{it.n}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill registry */}
          <div style={{padding:"8px 12px",borderBottom:"1px solid #e2e8f0"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>
              Реестр скиллов <span style={{color:"#cbd5e1",fontWeight:400}}>(в контексте)</span>
            </div>
            <div style={{
              padding:"6px 8px",borderRadius:6,
              border:s.hl?"2px solid #6366f1":"1px solid #e2e8f0",
              background:s.hl?"#eef2ff":"#fff",
              transition:"all .3s ease",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:12}}>📋</span>
                <span style={{fontSize:11,fontWeight:700,color:"#334155"}}>release-notes</span>
                {s.hl&&<span style={{marginLeft:"auto",fontSize:8,fontWeight:700,background:"#6366f1",color:"#fff",padding:"1px 5px",borderRadius:3}}>MATCH</span>}
              </div>
              <div style={{fontSize:10,color:"#64748b",marginTop:1,lineHeight:1.3}}>Generate release notes, enrich with tickets</div>
            </div>
          </div>

          {/* Tree */}
          {s.tree&&(
            <div style={{padding:"8px 12px",borderBottom:"1px solid #e2e8f0",animation:"fadeIn .3s ease"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Структура скилла</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,lineHeight:1.7}}>
                {SKILL_TREE.map((nd,i)=>{
                  const isHF=s.hlFile===nd.name;
                  return(
                    <div key={i} style={{
                      paddingLeft:nd.depth*14,display:"flex",alignItems:"center",gap:4,
                      color:nd.main?"#6366f1":nd.highlight?"#4f46e5":isHF?"#7c3aed":"#64748b",
                      fontWeight:(nd.main||nd.highlight||isHF)?700:400,
                      background:isHF?"#f5f3ff":"transparent",borderRadius:3,
                    }}>
                      <span style={{fontSize:10,opacity:.7}}>{nd.type==="folder"?"📁":"📄"}</span>
                      {nd.name}
                      {nd.main&&<span style={{fontSize:8,background:"#f59e0b",color:"#fff",padding:"0 4px",borderRadius:2,fontWeight:700}}>загружен</span>}
                      {isHF&&<span style={{fontSize:8,background:"#7c3aed",color:"#fff",padding:"0 4px",borderRadius:2,fontWeight:700}}>→ читай</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File */}
          {s.fc&&(
            <div style={{padding:"8px 12px",flex:1,animation:"fadeIn .3s ease"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>📄 {s.fn}</div>
              <pre style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:10,fontSize:10,lineHeight:1.5,color:"#334155",whiteSpace:"pre-wrap",margin:0,fontFamily:"'JetBrains Mono',monospace"}}>{s.fc}</pre>
            </div>
          )}

          {!s.fc&&s.panel==="reg"&&(
            <div style={{padding:16,flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#cbd5e1",fontSize:11,textAlign:"center",lineHeight:1.5}}>
              {si===0?"Описания скиллов уже в контексте.\nАгент матчит задачу по ним,\nа SKILL.md загружает по необходимости.":""}
            </div>
          )}
          {!s.fc&&s.panel==="done"&&(
            <div style={{padding:16,flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:10,padding:"12px 16px",textAlign:"center",animation:"fadeIn .3s ease"}}>
                <div style={{fontSize:22,marginBottom:4}}>🎉</div>
                <div style={{fontSize:12,fontWeight:700,color:"#065f46"}}>Release notes готовы</div>
                <div style={{fontSize:10,color:"#047857",marginTop:3,lineHeight:1.4}}>
                  SKILL.md → jira_integration.md → API<br/>Агент следовал цепочке файлов скилла.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{padding:"8px 20px",borderTop:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",flexShrink:0}}>
        <button onClick={()=>setSi(0)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>↺</button>
        <button onClick={()=>si>0&&setSi(si-1)} disabled={si===0} style={{padding:"6px 16px",borderRadius:6,border:"1px solid #e2e8f0",background:si===0?"#f8fafc":"#fff",color:si===0?"#cbd5e1":"#334155",fontSize:12,fontWeight:600,cursor:si===0?"default":"pointer"}}>←</button>
        <button onClick={()=>si<STEPS.length-1&&setSi(si+1)} disabled={si===STEPS.length-1} style={{padding:"6px 22px",borderRadius:6,border:"none",background:si===STEPS.length-1?"#e2e8f0":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:si===STEPS.length-1?"#94a3b8":"#fff",fontSize:13,fontWeight:700,cursor:si===STEPS.length-1?"default":"pointer",boxShadow:si<STEPS.length-1?"0 2px 10px #6366f144":"none"}}>Далее →</button>
      </div>

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        *{box-sizing:border-box;margin:0;}
        button:hover{filter:brightness(.96);}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:2px;}
        @media (max-width: 700px){
          .main-row{flex-direction:column !important;}
          .right-col{flex:0 0 auto !important;width:100% !important;min-width:0 !important;max-height:45% !important;border-top:1px solid #e2e8f0;}
        }
      `}</style>
    </div>
  );
}
