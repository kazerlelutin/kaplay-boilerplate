import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import {
  BOARD_COLUMNS, BOARD_ROWS, OBSTACLES, COVER, JAMMERS,
  createBattle, advanceRealtimeCycle, distance, enemySourceExposed, produceFluxSecond, fluxPerSecond,
  findModule,
  performAction, previewAction,
  type BattleAction, type BattleEvent, type BattleModule, type Point,
} from "./domain/battle";
import { fluxPath, visibleFluxLinks } from "./domain/flux-network";
import { lineBlocked } from "./domain/battle";
import { completeBattle } from "./finish";
import { setScreen } from "../../shared/ui/screen";
import { playCombatSound, type CombatSound } from "./audio";

type Command = "attack" | "cut" | "guard" | "repair" | "tune" | "neutralize" | "move" | "special";
const COMMANDS: Record<string, Command[]> = {
  "p-weapon": ["attack","special","move"],
  "p-barrier": ["guard","special","move"],
  "p-support": ["cut","repair","tune","special","neutralize","move"],
};
const NAMES: Record<Command,string> = {
  attack:"Frapper",cut:"Coupe-flux",guard:"Bouclier",repair:"Réparer",
  tune:"Optimiser",neutralize:"Neutraliser",move:"Déplacer",special:"Limite",
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
    let command:Command = "move";
    let showNetwork = false;
    let showRoute = false;
    let enemyId = "e-weapon";
    let allyId = "p-source";
    let destination:Point|null = null;
    let help = false;
    let running = false;
    let elapsed = 0;
    let energyElapsed = 0;
    let soundEnabled = true;
    let lastTap: {key:string;at:number}|null = null;
    let feedbackFor = 0;
    let feedback:BattleEvent[] = [];
    let warning = "";
    let exiting = false;
    let victoryScheduled = false;

    const actor = () => findModule(battle.player,actorId)!;
    const lookup = (id:string) => [...battle.player,...battle.enemy].find(u=>u.id===id);
    const activeCommand = ():BattleAction|null => {
      if (command==="attack") return {type:"attack",target:enemyId,power:1};
      if (command==="cut") return {type:"cut",target:enemyId,power:2};
      if (command==="repair") return {type:"repair",target:allyId,power:2};
      if (command==="guard") return {type:"guard",power:1};
      if (command==="tune") return {type:"tune"};
      if (command==="neutralize") return {type:"neutralize"};
      if (command==="special") return {type:"special",actor:actorId,target:enemyId};
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
      command="move";
      showRoute=false;
      destination=null;
      warning="";
      render();
    }
    function chooseCommand(name:Command):void {
      if (!COMMANDS[actorId].includes(name)) return;
      command=name;
      showRoute=true;
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
    function emitSound(kind:CombatSound):void {playCombatSound(kind,soundEnabled);}
    function confirm():void {
      if (running || battle.status!=="active") return;
      const selected=activeCommand();
      if (!selected) {
        warning="Choisissez une case de déplacement.";
        render();
        return;
      }
      const preview=previewAction(battle,selected);
      const result=performAction(battle,selected);
      warning=result.ok ? "" : result.reason;
      if (result.ok && (preview.fluxPlan?.hpCost??0)>0) emitSound("special");
      emitSound(result.ok
        ? selected.type==="attack"?"hit":selected.type==="cut"?"cut"
          : selected.type==="guard"?"shield":selected.type==="repair"?"repair"
            : selected.type==="move"?"step":selected.type==="special"?"special":"charge"
        : "error");
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
      const key=p.col+","+p.row;
      const now=performance.now();
      const isTarget=unit?.id.startsWith("e-") || (command==="repair" && unit?.id.startsWith("p-"))
        || !unit;
      if (isTarget && lastTap?.key===key && now-lastTap.at<520) {
        lastTap=null;
        confirm();
        return;
      }
      lastTap={key,at:now};
      showRoute=true;
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
      showRoute=true;
      const from=actor().position;
      destination={col:from.col+dx,row:from.row+dy};
      warning="";
      render();
    }

    function accessibleFlux(id:string):number {
      const member=findModule(battle.player,id);
      if(!member || member.hp<=0)return 0;
      const blocked=(a:Point,b:Point)=>lineBlocked(a,b,true);
      return member.energy + battle.player
        .filter(other=>other.id!==id && other.hp>0 && !!fluxPath(battle,id,other.id,blocked))
        .reduce((total,other)=>total+(other.role==="source"?battle.flux:other.energy),0);
    }

    function unitCard(unit:BattleModule, effect:BattleEvent|undefined):string {
      const mine=unit.id.startsWith("p-");
      const hp=Math.round(100*unit.hp/unit.maxHp);
      const isSource=unit.role==="source";
      const accessible=mine && !isSource ? accessibleFlux(unit.id) : 0;
      const connected=mine && !isSource && !!fluxPath(battle,unit.id,"p-source",(a,b)=>lineBlocked(a,b,true));
      const hit=effect?.target===unit.id;
      const shield=mine && battle.guard>0 && (isSource || unit.id==="p-barrier");
      const recovery=unit.hp===0 && unit.id.startsWith("e-") && unit.role!=="source"
        ? (unit.recoveryWait>0?"⏳ "+unit.recoveryWait : unit.recoveryStage==="repaired"?"Réparé":"HS")
        : "";
      const cue=hit ? (effect?.kind==="repair" ? "+" : effect?.kind==="flux" ? "⚡" : effect?.kind==="guard" ? "◆" : "−")
        +Math.abs(effect?.amount??0) : "";
      return `<span class="rpg-unit ${mine?"ally":"enemy"} ${isSource?"generator":""} ${unit.id===actorId?"selected":""}
        ${unit.hp===0?"disabled":""} ${hit?"affected":""} ${shield?"shielded":""}">
        <b>${ICONS[unit.id]}</b><span class="rpg-unit-name">${escapeHtml(unit.operator)}</span>
        <span class="rpg-hp"><i style="width:${hp}%"></i></span>
        <small>${unit.hp}/${unit.maxHp} PV</small>
        <span class="rpg-energy ${mine&&!isSource?(connected?"linked":"isolated"):""}"
          title="${mine&&!isSource?escapeHtml("Flux mobilisable : "+accessible+" · Réserve personnelle : "+unit.energy):"Réserve de la source"}">
          ${isSource?"⚡ "+(mine?battle.flux:battle.enemyFlux)+" stock":mine
            ?"⚡ "+accessible+" dispo": "⚡ "+unit.energy+" réserve"}
        </span>
        ${shield?`<span class="rpg-shield-label">◆ ${battle.guard}</span>`:""}
        ${recovery?`<span class="rpg-recovery">${recovery}</span>`:""}
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
      const links=showNetwork ? visibleFluxLinks(battle,(a,b)=>lineBlocked(a,b,true)) : [];
      const network=links.map(link=>{
        const a=lookup(link.from),b=lookup(link.to);
        return a&&b?svgLine(a.position,b.position,link.active?"rpg-link":"rpg-link broken"):"";
      }).join("");
      const energy=showRoute && !running ? preview?.fluxPlan?.donors.flatMap(donor=>{
        const segments:string[]=[];
        for(let i=0;i<donor.path.length-1;i++){
          const a=lookup(donor.path[i]),b=lookup(donor.path[i+1]);
          if(a&&b)segments.push(svgLine(a.position,b.position,"rpg-transfer"));
        }
        return segments;
      }).join("")??"" : "";
      // Le réseau ennemi n'est pas affiché : ses traits brouillaient la lecture de l'arène.
      const recent=feedbackFor>0?feedback:[];
      const enemyFX=recent.filter(e=>e.kind==="move"||e.kind==="attack"||e.kind==="special")
        .map(event=>{
          const a=event.from??(event.kind==="attack"?findModule(battle.enemy,"e-weapon")?.position:undefined);
          const b=event.to??lookup(event.target??"")?.position;
          if(!a||!b)return "";
          const s=pos(a),d=pos(b);
          return `<line x1="${s.x}" y1="${s.y}" x2="${d.x}" y2="${d.y}" class="rpg-enemy-effect">
            <animate attributeName="stroke-dashoffset" from="85" to="0" dur=".85s" fill="freeze"/></line>
            <circle cx="0" cy="0" r="12" class="rpg-projectile">
              <animateMotion path="M ${s.x} ${s.y} L ${d.x} ${d.y}" dur=".65s" fill="freeze"/>
              <animate attributeName="opacity" from="1" to="0" begin=".7s" dur=".15s" fill="freeze"/>
            </circle>
            <circle cx="${d.x}" cy="${d.y}" r="14" class="rpg-impact">
              <animate attributeName="r" from="4" to="30" dur=".8s" fill="freeze"/>
              <animate attributeName="opacity" from="1" to="0" dur=".8s" fill="freeze"/></circle>`;
        }).join("");
      const aim=showRoute && selected&&battle.phase==="player"&&!running
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
          <span class="rpg-stage-tools"><span>ADVERSAIRES</span>
            <button type="button" class="rpg-network-toggle" data-network>
              ${showNetwork?"Masquer le réseau":"Voir le réseau"}</button></span></div>
        <div class="rpg-board" style="grid-template-columns:repeat(${BOARD_COLUMNS},minmax(0,1fr));grid-template-rows:repeat(${BOARD_ROWS},minmax(0,1fr))"
          aria-label="Terrain tactique, ${BOARD_COLUMNS} colonnes et ${BOARD_ROWS} lignes">
          ${cells.join("")}
          <svg class="rpg-threads" viewBox="0 0 ${BOARD_COLUMNS*100} ${BOARD_ROWS*100}" preserveAspectRatio="none" aria-hidden="true">
            ${network}${energy}${aim}${battle.guard>0
            ?`<circle class="rpg-shield-field" cx="${pos(findModule(battle.player,"p-source")!.position).x}"
               cy="${pos(findModule(battle.player,"p-source")!.position).y}" r="135"/>`:""}${enemyFX}
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
        <span>Énergie +${fluxPerSecond(battle)}⚡/s (max 8/cycle) · ennemis toutes les ${CYCLE_SECONDS}s.</span>
        <button type="button" class="rpg-primary" data-pause>⏸ Pause tactique · Espace</button>
      </section>`;
      const choices=COMMANDS[actorId];
      const selected=activeCommand();
      const pre=selected?previewAction(battle,selected):null;
      const pathInfo=pre?.fluxPlan?.donors.map(d=>d.path.map(id=>lookup(id)?.operator??id).join(" → ")
        +" ("+d.amount+"⚡)").join(" · ");
      const hpCost=pre?.ok ? (pre.fluxPlan?.hpCost??0) : 0;
      const healthOwner=pre?.source?lookup(pre.source):undefined;
      return `<section class="rpg-toolbar">
        <div class="rpg-selection">
          <span class="rpg-eyebrow">UNITÉ · TOUCHES 1–3</span>
          <div class="rpg-hero-switch">${battle.player.filter(u=>u.role!=="source").map((u,i)=>
            `<button type="button" data-actor="${u.id}" class="${actorId===u.id?"active":""}">${i+1} ${u.operator}
                <small>⚡ ${accessibleFlux(u.id)} disponible</small></button>`).join("")}</div>
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
            ${pre?`<span class="rpg-power">${command==="move"?"0 Flux · mouvement gratuit":pre.cost+" Flux"}</span>`:""}
          </div>
          <p>${escapeHtml(pre?.reason||pre?.description||"Choisissez une case libre.")}</p>
          ${pathInfo?`<small class="rpg-path">⚡ ${escapeHtml(pathInfo)}</small>`:""}
          ${hpCost>0?`<strong class="rpg-health-payment" role="status">
            ♥ Énergie manquante : −${hpCost} PV · ${healthOwner?.hp??0} → ${(healthOwner?.hp??0)-hpCost} PV
          </strong>`:""}
          ${pre?.fluxPlan&&!pre.fluxPlan.ok?`<small class="rpg-broken">⛓ Flux insuffisant et sacrifice impossible</small>`:""}
          <button type="button" class="rpg-primary ${hpCost>0?"rpg-health-confirm":""}" data-confirm ${!pre?.ok?"disabled":""}>
            ${hpCost>0?`Confirmer : −${hpCost} PV · Entrée`:"Confirmer · Entrée"}</button>
        </div>
      </section>`;
    }
    function overlay():string {
      if(!help)return "";
      return `<div class="rpg-help-backdrop"><section class="rpg-help" role="dialog" aria-modal="true" aria-label="Contrôles du combat">
        <h2>Le réseau de Flux</h2>
        <p>Une action puise automatiquement dans la réserve de son utilisateur, les alliés reliés, puis le générateur.</p>
        <p><strong>⚡ Disponible</strong> sur une unité représente tout le Flux qu'elle peut emprunter au réseau, et pas seulement sa réserve personnelle. Tous les alliés ont accès à l'énergie dès le début du combat.</p>
        <p><strong>Voir le réseau :</strong> affiche les liaisons cyan connectées et les liaisons orange coupées. Les trajets d'action n'apparaissent que lors du choix d'une commande ou d'une cible.</p>
        <p>Les opérateurs conservent leurs réserves entre les cycles. Lyrius peut améliorer la production du générateur. Les obstacles et brouilleurs peuvent isoler une unité.</p>
        <p><strong>Énergie de secours :</strong> quand les réserves et le réseau sont insuffisants,
          un personnage peut sacrifier 1 PV pour chaque Flux manquant. La dernière unité de vie
          ne peut pas être dépensée. Le coût est indiqué avant confirmation.</p>
        <p><strong>Déplacements :</strong> aucune dépense de Flux. Vous disposez de trois points de mouvement par cycle : case 1, diagonale 2.</p>
        <p><strong>Coûts :</strong> attaque 1 Flux ; coupe-flux et réparation 2 ; limite 3 ; chimère 6 (non disponible dans la démo).</p>
        <p><strong>Production :</strong> le générateur fabrique ${fluxPerSecond(battle)} Flux chaque seconde, dans la limite de 8 par cycle.</p>
        <p><strong>Limites :</strong> Coups foudroyants (Kumji), Mégatemps (Darla), Martial (Lyrius). Les effets sont provisoires tant que les fiches de compétences détaillées ne sont pas intégrées.</p>
        <p><strong>Clavier :</strong> 1–3 personnages, 4–9 actions, flèches ou ZQSD mouvement, A/E/W/C diagonales, Entrée ou double-clic confirmation, Espace pause/lancer.</p>
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
      const root=setScreen(`<main class="rpg-combat">
        <div class="rpg-shell">
          <header class="rpg-header">
            <div><span class="rpg-eyebrow">THE DUNBLANE QUEST · COMBAT</span>
              <strong>${running?"SIMULATION":"PAUSE TACTIQUE"} · CYCLE ${battle.round}</strong></div>
            <div class="rpg-header-stats">
              <span class="rpg-flux">✦ ${battle.flux}⚡ <small>+${fluxPerSecond(battle)}/s · ${battle.fluxProducedThisCycle}/8 ce cycle</small></span>
              <span>◆ ${battle.guard}</span>
              <span id="rpg-clock">${running?Math.ceil(CYCLE_SECONDS-elapsed)+"s":"En pause"}</span>
              <button type="button" class="rpg-main-toggle" data-pause>${running?"⏸ Pause":"▶ Lancer"} <small>Espace</small></button>
              <button type="button" class="rpg-sound-toggle" data-sound aria-label="Activer ou désactiver les effets sonores">
                ${soundEnabled?"♪ Son":"♪ Muet"}</button>
              <button type="button" class="rpg-help-trigger" data-help>?</button>
            </div>
          </header>
          ${battlefield()}
          ${recap()}
          ${commands()}
          <div class="rpg-hint">⚡ Disponible = réserve personnelle + Flux accessible par les relais · Choisissez une action pour voir son trajet.</div>
          ${warning?`<div class="rpg-warning" role="alert">${escapeHtml(warning)}</div>`:""}
        </div>${overlay()}
      </main>`);
      root.querySelectorAll<HTMLButtonElement>("[data-network]").forEach(b=>b.addEventListener("click",()=>{
        showNetwork=!showNetwork;render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-pos]").forEach(b=>b.addEventListener("click",()=>{
        const [col,row]=b.dataset.pos!.split(",").map(Number);
        selectTile({col,row});
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-actor]").forEach(b=>b.addEventListener("click",()=>chooseActor(b.dataset.actor!)));
      root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b=>b.addEventListener("click",()=>chooseCommand(b.dataset.order as Command)));
      root.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click",confirm);
      root.querySelectorAll<HTMLButtonElement>("[data-pause]").forEach(b=>b.addEventListener("click",toggle));
      root.querySelectorAll<HTMLButtonElement>("[data-sound]").forEach(b=>b.addEventListener("click",()=>{
        soundEnabled=!soundEnabled; if(soundEnabled)emitSound("charge"); render();
      }));
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

    k.onUpdate(()=>{
      if(feedbackFor>0) {
        feedbackFor=Math.max(0,feedbackFor-k.dt());
        if(feedbackFor===0)render();
      }
      if(!running || battle.status!=="active")return;
      const dt=k.dt();
      energyElapsed+=dt;
      let energyUpdated=false;
      while(energyElapsed>=1) {
        energyElapsed-=1;
        const produced=produceFluxSecond(battle);
        if (produced>0) { energyUpdated=true; feedbackFor=Math.max(feedbackFor,.65); }
      }
      elapsed+=dt;
      const clock=document.querySelector<HTMLElement>("#rpg-clock");
      if(clock)clock.textContent=Math.max(0,Math.ceil(CYCLE_SECONDS-elapsed))+"s";
      if(elapsed<CYCLE_SECONDS) {if(energyUpdated)render();return;}
      elapsed-=CYCLE_SECONDS;
      advanceRealtimeCycle(battle);
      feedback=battle.enemyEvents.slice(-6);
      feedbackFor=2.5;
      const notable=feedback.find(event=>event.kind==="attack"||event.kind==="special"
        ||event.kind==="revive"||event.kind==="move"||event.kind==="repair");
      if(notable)emitSound(notable.kind==="attack"?"enemy"
        :notable.kind==="move"?"step":notable.kind==="repair"?"repair"
        :notable.kind==="revive"?"revive":"special");
      render();
    });
    render();
  });
}
