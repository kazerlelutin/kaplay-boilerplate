import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import {
  BOARD_COLUMNS, BOARD_ROWS, OBSTACLES, COVER, JAMMERS,
  createBattle, advanceRealtimeCycle, distance, enemySourceExposed,
  findModule, getEnemyIntent, getFluxEconomy, isBoardCellFree, moveCost,
  performAction, previewAction,
  type BattleAction, type BattleEvent, type BattleModule, type Point,
} from "./domain/battle";
import { visibleFluxLinks } from "./domain/flux-network";
import { lineBlocked } from "./domain/battle";
import { completeBattle } from "./finish";
import { setScreen } from "../../shared/ui/screen";

type Command = "attack" | "cut" | "guard" | "repair" | "tune" | "neutralize" | "move";
const COMMANDS: Record<string, Command[]> = {
  "p-weapon": ["attack","move"],
  "p-barrier": ["guard","move"],
  "p-support": ["cut","repair","tune","neutralize","move"],
};
const NAMES: Record<Command,string> = {
  attack:"Frapper",cut:"Coupe-flux",guard:"Bouclier",repair:"Réparer",
  tune:"Optimiser",neutralize:"Neutraliser",move:"Déplacer",
};
const ICONS: Record<string,string> = {
  "p-weapon":"K","p-barrier":"D","p-support":"L","p-source":"✦",
  "e-weapon":"⚔","e-barrier":"◇","e-relay":"◎","e-source":"✦",
};
const escapeHtml = (s:string) => s.replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;");
const pos = (p:Point) => ({x:(p.col+.5)*100,y:(p.row+.5)*100});
const CYCLE_SECONDS = 3;

export function registerBattleScene(k:KAPLAYCtx, session:GameSession):void {
  k.scene("battle",()=>{
    const battle = createBattle(session.battleKind);
    // Plus aucune distribution obligatoire : chaque action appelle directement le réseau.
    performAction(battle,{type:"orders"});

    let actorId = "p-weapon";
    let command:Command = "attack";
    let enemyId = "e-weapon";
    let allyId = "p-source";
    let destination:Point|null = null;
    let power = 3;
    let help = false;
    let running = false;
    let elapsed = 0;
    let feedbackFor = 0;
    let feedback:BattleEvent[] = [];
    let warning = "";
    let exiting = false;
    let victoryScheduled = false;

    const actor = () => findModule(battle.player,actorId)!;
    const lookup = (id:string) => [...battle.player,...battle.enemy].find(u=>u.id===id);
    const activeCommand = ():BattleAction|null => {
      if (command==="attack" || command==="cut")
        return {type:command,target:enemyId,power};
      if (command==="repair") return {type:"repair",target:allyId,power};
      if (command==="guard") return {type:"guard",power};
      if (command==="tune") return {type:"tune"};
      if (command==="neutralize") return {type:"neutralize"};
      return destination ? {type:"move",actor:actorId,to:destination} : null;
    };

    function goBack():void {
      if (exiting) return;
      const target = completeBattle(battle,session);
      if (!target) return;
      exiting = true;
      k.go(target);
    }
    function chooseActor(id:string):void {
      if (!COMMANDS[id]) return;
      actorId=id;
      command=COMMANDS[id][0];
      destination=null;
      warning="";
      render();
    }
    function chooseCommand(name:Command):void {
      if (!COMMANDS[actorId].includes(name)) return;
      command=name;
      destination=null;
      warning="";
      render();
    }
    function toggle():void {
      if (battle.status!=="active") return;
      running=!running;
      if (running) elapsed=0;
      warning="";
      render();
    }
    function confirm():void {
      if (running || battle.status!=="active") return;
      const selected=activeCommand();
      if (!selected) {
        warning="Choisissez une case de déplacement.";
        render();
        return;
      }
      const result=performAction(battle,selected);
      warning=result.ok ? "" : result.reason;
      if (result.ok) {
        feedback=battle.events.filter(e=>e.kind!=="turn").slice(-3);
        feedbackFor=2.4;
        destination=null;
      }
      render();
    }
    function selectTile(p:Point):void {
      if (running || battle.status!=="active") return;
      const unit=[...battle.player,...battle.enemy].find(u=>distance(u.position,p)===0);
      if (unit?.id.startsWith("e-")) {
        enemyId=unit.id;
        if (actorId==="p-weapon") command="attack";
        else if (actorId==="p-support") command="cut";
        else warning="Darla ne peut pas attaquer. Sélectionnez Kumji ou Lyrius.";
      } else if (unit?.id==="p-source") {
        actorId="p-support";
        command="repair";
        allyId="p-source";
      } else if (unit?.id.startsWith("p-")) {
        if (command==="repair" && actorId==="p-support") allyId=unit.id;
        else {actorId=unit.id;command=COMMANDS[unit.id][0];}
      } else {
        command="move";
        destination=p;
      }
      render();
    }
    function move(dx:number,dy:number):void {
      if (running || battle.status!=="active") return;
      command="move";
      const from=actor().position;
      destination={col:from.col+dx,row:from.row+dy};
      warning="";
      render();
    }
    function changePower(delta:number):void {
      if (running || battle.status!=="active") return;
      power=Math.max(2,Math.min(6,power+delta));
      render();
    }

    function unitCard(unit:BattleModule, effect:BattleEvent|undefined):string {
      const mine=unit.id.startsWith("p-");
      const hp=Math.round(100*unit.hp/unit.maxHp);
      const isSource=unit.role==="source";
      const hit=effect?.target===unit.id;
      const cue=hit ? (effect?.kind==="repair" ? "+" : effect?.kind==="flux" ? "⚡" : effect?.kind==="guard" ? "◆" : "−")
        +Math.abs(effect?.amount??0) : "";
      return `<span class="rpg-unit ${mine?"ally":"enemy"} ${isSource?"generator":""} ${unit.id===actorId?"selected":""}
        ${unit.hp===0?"disabled":""} ${hit?"affected":""}">
        <b>${ICONS[unit.id]}</b><span class="rpg-unit-name">${escapeHtml(unit.operator)}</span>
        <span class="rpg-hp"><i style="width:${hp}%"></i></span>
        <small>${unit.hp}/${unit.maxHp} PV</small>
        <span class="rpg-energy">${isSource?(mine?battle.flux:battle.enemyFlux):unit.energy} ⚡</span>
        ${hit?`<span class="rpg-float">${cue}</span>`:""}
      </span>`;
    }
    function svgLine(a:Point,b:Point,cls:string):string {
      const start=pos(a),end=pos(b);
      return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" class="${cls}"/>`;
    }
    function battlefield():string {
      const selected=activeCommand();
      const preview=selected?previewAction(battle,selected):null;
      const links=visibleFluxLinks(battle,(a,b)=>lineBlocked(a,b,true));
      const network=links.map(link=>{
        const a=lookup(link.from),b=lookup(link.to);
        return a&&b?svgLine(a.position,b.position,link.active?"rpg-link":"rpg-link broken"):"";
      }).join("");
      const energy=preview?.fluxPlan?.donors.flatMap(donor=>{
        const segments:string[]=[];
        for(let i=0;i<donor.path.length-1;i++){
          const a=lookup(donor.path[i]),b=lookup(donor.path[i+1]);
          if(a&&b)segments.push(svgLine(a.position,b.position,"rpg-transfer"));
        }
        return segments;
      }).join("")??"";
      const enemyWires=battle.enemy.filter(u=>u.role!=="source"&&u.hp>0).map(unit=>{
        const core=findModule(battle.enemy,"e-source")!;
        return svgLine(core.position,unit.position,"rpg-enemy-link");
      }).join("");
      const recent=feedbackFor>0?feedback:[];
      const enemyFX=recent.filter(e=>e.kind==="move"||e.kind==="attack")
        .map(event=>{
          const a=event.from??(event.kind==="attack"?findModule(battle.enemy,"e-weapon")?.position:undefined);
          const b=event.to??lookup(event.target??"")?.position;
          if(!a||!b)return "";
          const s=pos(a),d=pos(b);
          return `<line x1="${s.x}" y1="${s.y}" x2="${d.x}" y2="${d.y}" class="rpg-enemy-effect">
            <animate attributeName="stroke-dashoffset" from="85" to="0" dur=".85s" fill="freeze"/></line>
            <circle cx="${d.x}" cy="${d.y}" r="14" class="rpg-impact">
              <animate attributeName="r" from="4" to="30" dur=".8s" fill="freeze"/>
              <animate attributeName="opacity" from="1" to="0" dur=".8s" fill="freeze"/></circle>`;
        }).join("");
      const enemyPlan=getEnemyIntent(battle);
      const threat=enemyPlan.target&&battle.status==="active"
        ? (()=>{const a=lookup("e-weapon"),b=lookup(enemyPlan.target!);
          return a&&b?svgLine(a.position,b.position,"rpg-intent"):"";})():"";
      const aim=selected&&battle.phase==="player"&&!running
        ? (()=>{const from=lookup(preview?.source??actorId);
          const to=selected.type==="move"?selected.to
            : lookup(preview?.target??(selected.type==="guard"||selected.type==="tune"?"p-source":enemyId))?.position;
          return from&&to?svgLine(from.position,to,preview?.ok?"rpg-aim":"rpg-aim invalid"):"";})():"";
      const selectedTarget=selected?.type==="move"?selected.to
        : lookup(preview?.target??"")?.position;
      const eventAt=(id:string)=>recent.findLast(e=>e.target===id);
      const cells:string[]=[];
      for(let row=0;row<BOARD_ROWS;row++)for(let col=0;col<BOARD_COLUMNS;col++){
        const point={col,row};
        const unit=[...battle.player,...battle.enemy].find(u=>distance(u.position,point)===0);
        const rock=OBSTACLES.some(p=>distance(p,point)===0);
        const cover=COVER.some(p=>distance(p,point)===0);
        const jam=JAMMERS.some(p=>distance(p,point)===0);
        const reached=selectedTarget&&distance(selectedTarget,point)===0;
        const classes=["rpg-cell",(row+col)%2?"alt":"",rock?"rock":"",cover?"cover":"",
          jam?"jammer":"",reached&&!running?"target":"",unit?.id===actorId?"focus":""].filter(Boolean).join(" ");
        const label=unit?unit.operator+" "+unit.hp+"/"+unit.maxHp+" PV":
          rock?"Rocher":jam?"Brouilleur":cover?"Couverture":"Case "+(col+1)+","+(row+1);
        const terrain=rock?"◆":jam?"⌁":cover?"▥":"";
        cells.push(`<button class="${classes}" data-pos="${col},${row}" type="button"
          aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${rock?"disabled":""}>
          ${unit?unitCard(unit,eventAt(unit.id)):`<span class="rpg-terrain">${terrain}</span>`}
          ${unit?.id==="e-source"&&!enemySourceExposed(battle)?'<span class="rpg-lock">🔒</span>':""}
        </button>`);
      }
      return `<div class="rpg-stage">
        <div class="rpg-stage-label"><span>VOTRE ÉQUIPE</span>
          <span>${battle.kind==="training"?"Couper l'émetteur":"Couper l'émetteur et le relais"}</span>
          <span>ADVERSAIRES</span></div>
        <div class="rpg-board" aria-label="Terrain tactique et réseaux de Flux">
          ${cells.join("")}
          <svg class="rpg-threads" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true">
            ${network}${enemyWires}${threat}${energy}${aim}${enemyFX}
          </svg>
        </div>
      </div>`;
    }
    function recap():string {
      const events=feedbackFor>0?feedback:[];
      const enemyEvents=events.filter(e=>e.kind!=="turn");
      const last=enemyEvents.length?enemyEvents:battle.enemyEvents.slice(-3);
      const ongoing=running?"SIMULATION EN COURS":"PAUSE TACTIQUE";
      const summary=last.length
        ? last.map(e=>`<span class="rpg-event ${e.kind}">${escapeHtml(e.text)}</span>`).join("")
        : "<span>Les ennemis se déplaceront et attaqueront pendant la simulation.</span>";
      return `<section class="rpg-reaction" aria-live="polite">
        <strong>${ongoing}</strong><div class="rpg-event-list">${summary}</div>
      </section>`;
    }
    function commands():string {
      if (running) return `<section class="rpg-toolbar live">
        <span>La production et les ennemis agissent toutes les ${CYCLE_SECONDS} secondes.</span>
        <button type="button" class="rpg-primary" data-pause>⏸ Pause tactique · Espace</button>
      </section>`;
      const choices=COMMANDS[actorId];
      const selected=activeCommand();
      const pre=selected?previewAction(battle,selected):null;
      const pathInfo=pre?.fluxPlan?.donors.map(d=>d.path.map(id=>lookup(id)?.operator??id).join(" → ")
        +" ("+d.amount+"⚡)").join(" · ");
      const needPower=["attack","cut","guard","repair"].includes(command);
      return `<section class="rpg-toolbar">
        <div class="rpg-selection">
          <span class="rpg-eyebrow">UNITÉ · TOUCHES 1–3</span>
          <div class="rpg-hero-switch">${battle.player.filter(u=>u.role!=="source").map((u,i)=>
            `<button type="button" data-actor="${u.id}" class="${actorId===u.id?"active":""}">${i+1} ${u.operator}
                <small>${u.energy}⚡</small></button>`).join("")}</div>
        </div>
        <div class="rpg-orders">
          <span class="rpg-eyebrow">ACTION · TOUCHES 4–9</span>
          <div class="rpg-order-switch">${choices.map((choice,i)=>
            `<button type="button" data-order="${choice}" class="${command===choice?"active":""}">
              <small>${i+4}</small> ${NAMES[choice]}</button>`).join("")}</div>
        </div>
        <div class="rpg-preview">
          <div class="rpg-preview-top">
            <strong>${escapeHtml(pre?.title??"Choisissez une case")}</strong>
            ${needPower?`<span class="rpg-power">
              <button data-power="-1" aria-label="Moins de puissance">−</button>
              ${power}⚡
              <button data-power="1" aria-label="Plus de puissance">+</button></span>`:""}
          </div>
          <p>${escapeHtml(pre?.reason||pre?.description||"Choisissez une case libre.")}</p>
          ${pathInfo?`<small class="rpg-path">⚡ ${escapeHtml(pathInfo)}</small>`:""}
          ${pre?.fluxPlan&&!pre.fluxPlan.ok?`<small class="rpg-broken">⛓ Liaison insuffisante ou rompue</small>`:""}
          <button type="button" class="rpg-primary" data-confirm ${!pre?.ok?"disabled":""}>
            Confirmer · Entrée</button>
        </div>
      </section>`;
    }
    function overlay():string {
      if(!help)return "";
      return `<div class="rpg-help-backdrop"><section class="rpg-help" role="dialog" aria-modal="true" aria-label="Contrôles du combat">
        <h2>Le réseau de Flux</h2>
        <p>Une action puise automatiquement dans la réserve de son utilisateur, les alliés reliés, puis le générateur.</p>
        <p><strong>Traits cyan :</strong> Flux connecté. <strong>Traits orange :</strong> liaison coupée. Le trajet actif est éclairé lorsqu'une action est choisie.</p>
        <p>Les opérateurs conservent leurs réserves entre les cycles. Lyrius peut améliorer la production du générateur. Les obstacles et brouilleurs peuvent isoler une unité.</p>
        <p><strong>Clavier :</strong> 1–3 choisir le personnage, 4–9 choisir une action, flèches ou ZQSD pour préparer un déplacement, A/E/W/C pour les diagonales, +/− pour la puissance, Entrée confirmer, Espace pause/lancer.</p>
        <button type="button" class="rpg-primary" data-help>Fermer · Échap</button>
      </section></div>`;
    }
    function resultScreen():void {
      const won=battle.status==="victory";
      const root=setScreen(`<main class="screen-center"><section class="game-card result-card">
        <span class="eyebrow">${won?"VICTOIRE":"RÉSEAU HORS SERVICE"}</span>
        <h1>${won?"Réseau neutralisé":"Défaite"}</h1>
        <p>${won?"La mission continue.":"La cellule doit rester alimentée et protégée."}</p>
        <button type="button" class="pixel-button primary" data-leave>${won?"Continuer":"Réessayer"} ▸</button>
      </section></main>`);
      root.querySelector<HTMLButtonElement>("[data-leave]")?.addEventListener("click",goBack);
      if(won&&!victoryScheduled) {
        victoryScheduled=true;
        k.wait(.7,goBack);
      }
    }
    function render():void {
      if(battle.status!=="active") {running=false;resultScreen();return;}
      const economy=getFluxEconomy(battle);
      const root=setScreen(`<main class="rpg-combat">
        <div class="rpg-shell">
          <header class="rpg-header">
            <div><span class="rpg-eyebrow">THE DUNBLANE QUEST · COMBAT</span>
              <strong>${running?"SIMULATION":"PAUSE TACTIQUE"} · CYCLE ${battle.round}</strong></div>
            <div class="rpg-header-stats">
              <span class="rpg-flux">✦ ${battle.flux}⚡ <small>+${economy.available}/cycle</small></span>
              <span>◆ ${battle.guard}</span>
              <span id="rpg-clock">${running?Math.ceil(CYCLE_SECONDS-elapsed)+"s":"En pause"}</span>
              <button type="button" class="rpg-main-toggle" data-pause>${running?"⏸ Pause":"▶ Lancer"} <small>Espace</small></button>
              <button type="button" class="rpg-help-trigger" data-help>?</button>
            </div>
          </header>
          ${battlefield()}
          ${recap()}
          ${commands()}
          <div class="rpg-hint">Sélectionnez une unité ou une cible sur le terrain · Le Flux circule automatiquement.</div>
          ${warning?`<div class="rpg-warning" role="alert">${escapeHtml(warning)}</div>`:""}
        </div>${overlay()}
      </main>`);
      root.querySelectorAll<HTMLButtonElement>("[data-pos]").forEach(b=>b.addEventListener("click",()=>{
        const [col,row]=b.dataset.pos!.split(",").map(Number);
        selectTile({col,row});
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-actor]").forEach(b=>b.addEventListener("click",()=>chooseActor(b.dataset.actor!)));
      root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b=>b.addEventListener("click",()=>chooseCommand(b.dataset.order as Command)));
      root.querySelectorAll<HTMLButtonElement>("[data-power]").forEach(b=>b.addEventListener("click",()=>changePower(Number(b.dataset.power))));
      root.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click",confirm);
      root.querySelectorAll<HTMLButtonElement>("[data-pause]").forEach(b=>b.addEventListener("click",toggle));
      root.querySelectorAll<HTMLButtonElement>("[data-help]").forEach(b=>b.addEventListener("click",()=>{
        help=!help;
        if(help)running=false;
        render();
      }));
    }

    // Les raccourcis sont gérés par KAPLAY : ils disparaissent avec la scène.
    for(const [i,id] of ["p-weapon","p-barrier","p-support"].entries())
      k.onKeyPress(String(i+1),()=>{if(!help)chooseActor(id);});
    for(let i=4;i<=9;i++)k.onKeyPress(String(i),()=>{
      if(help||running)return;
      const next=COMMANDS[actorId][i-4];
      if(next)chooseCommand(next);
    });
    k.onKeyPress("space",()=>{if(!help)toggle();});
    k.onKeyPress("enter",()=>{if(battle.status!=="active")goBack();else if(!help)confirm();});
    k.onKeyPress("escape",()=>{if(help){help=false;render();}});
    k.onKeyPress("up",()=>move(0,-1));
    k.onKeyPress("down",()=>move(0,1));
    k.onKeyPress("left",()=>move(-1,0));
    k.onKeyPress("right",()=>move(1,0));
    k.onKeyPress("z",()=>move(0,-1));
    k.onKeyPress("s",()=>move(0,1));
    k.onKeyPress("q",()=>move(-1,0));
    k.onKeyPress("d",()=>move(1,0));
    k.onKeyPress("a",()=>move(-1,-1));
    k.onKeyPress("e",()=>move(1,-1));
    k.onKeyPress("w",()=>move(-1,1));
    k.onKeyPress("c",()=>move(1,1));
    k.onKeyPress("=",()=>changePower(1));
    k.onKeyPress("-",()=>changePower(-1));

    k.onUpdate(()=>{
      if(feedbackFor>0) {
        feedbackFor=Math.max(0,feedbackFor-k.dt());
        if(feedbackFor===0)render();
      }
      if(!running || battle.status!=="active")return;
      elapsed+=k.dt();
      const clock=document.querySelector<HTMLElement>("#rpg-clock");
      if(clock)clock.textContent=Math.max(0,Math.ceil(CYCLE_SECONDS-elapsed))+"s";
      if(elapsed<CYCLE_SECONDS)return;
      elapsed-=CYCLE_SECONDS;
      advanceRealtimeCycle(battle);
      feedback=battle.enemyEvents.slice(-4);
      feedbackFor=2.5;
      render();
    });
    render();
  });
}
