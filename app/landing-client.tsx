"use client";
import { useEffect, useRef } from "react";

export default function LandingClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle/grid background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    // Grid dots
    const dots: { x: number; y: number; o: number; speed: number }[] = [];
    const spacing = 60;
    for (let x = 0; x < w; x += spacing) {
      for (let y = 0; y < h; y += spacing) {
        dots.push({ x, y, o: Math.random() * 0.3 + 0.05, speed: Math.random() * 0.005 + 0.002 });
      }
    }

    let frame = 0;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;
      for (const d of dots) {
        d.o = 0.05 + Math.abs(Math.sin(frame * d.speed)) * 0.2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,30,30,${d.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{
          --red:#e8271a;
          --red-dim:#9a1a10;
          --red-glow:rgba(232,39,26,0.15);
          --bg:#0a0a0b;
          --bg2:#111113;
          --bg3:#18181b;
          --border:rgba(255,255,255,0.07);
          --text:#ffffff;
          --muted:#71717a;
          --green:#22c55e;
        }
        html{scroll-behavior:smooth;}
        body{
          background:var(--bg);
          color:var(--text);
          font-family:'DM Mono',monospace;
          overflow-x:hidden;
          -webkit-font-smoothing:antialiased;
        }
        a{text-decoration:none;color:inherit;}

        /* ── NAV ── */
        nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          padding:0 48px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(10,10,11,0.85);
          backdrop-filter:blur(12px);
          border-bottom:1px solid var(--border);
        }
        .nav-logo{
          font-family:'Syne',sans-serif;font-size:18px;font-weight:800;
          letter-spacing:3px;text-transform:uppercase;
          color:var(--text);display:flex;align-items:center;gap:8px;
        }
        .nav-logo .skull{color:var(--red);font-size:20px;}
        .nav-links{display:flex;align-items:center;gap:36px;list-style:none;}
        .nav-links a{
          font-size:12px;letter-spacing:2px;text-transform:uppercase;
          color:var(--muted);transition:color 0.2s;
        }
        .nav-links a:hover{color:var(--text);}
        .nav-cta{
          background:var(--red);color:#fff;
          padding:9px 22px;
          font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px;
          text-transform:uppercase;border:none;cursor:pointer;
          transition:all 0.2s;display:inline-block;
        }
        .nav-cta:hover{background:#c92317;box-shadow:0 0 24px rgba(232,39,26,0.4);}

        /* ── HERO ── */
        .hero{
          min-height:100vh;
          display:flex;flex-direction:column;justify-content:center;
          padding:120px 48px 80px;
          position:relative;overflow:hidden;
        }
        canvas{position:absolute;inset:0;pointer-events:none;opacity:0.6;}
        .hero-inner{position:relative;z-index:1;max-width:800px;}

        .hero-eyebrow{
          display:inline-flex;align-items:center;gap:8px;
          background:var(--red-glow);border:1px solid rgba(232,39,26,0.25);
          padding:6px 14px;margin-bottom:32px;
          font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--red);
        }
        .hero-eyebrow .dot{
          width:6px;height:6px;border-radius:50%;background:var(--red);
          animation:pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.7)}}

        h1{
          font-family:'Syne',sans-serif;
          font-size:clamp(52px,8vw,96px);
          font-weight:800;line-height:0.95;
          letter-spacing:-2px;
          text-transform:uppercase;
          margin-bottom:28px;
        }
        h1 .line-white{color:var(--text);display:block;}
        h1 .line-red{
          color:var(--red);display:block;
          text-shadow:0 0 60px rgba(232,39,26,0.4);
          position:relative;
        }

        .hero-desc{
          font-size:15px;color:var(--muted);
          max-width:500px;line-height:1.9;
          margin-bottom:44px;letter-spacing:0.3px;
        }

        .hero-btns{display:flex;gap:14px;align-items:center;flex-wrap:wrap;}
        .btn-red{
          background:var(--red);color:#fff;padding:14px 32px;
          font-family:'DM Mono',monospace;font-size:13px;letter-spacing:1px;
          text-transform:uppercase;border:none;cursor:pointer;
          display:inline-flex;align-items:center;gap:8px;
          transition:all 0.2s;
        }
        .btn-red:hover{background:#c92317;box-shadow:0 8px 32px rgba(232,39,26,0.35);}
        .btn-ghost{
          color:var(--muted);font-size:12px;letter-spacing:2px;text-transform:uppercase;
          display:inline-flex;align-items:center;gap:6px;
          border:1px solid var(--border);padding:14px 24px;
          transition:all 0.2s;
        }
        .btn-ghost:hover{color:var(--text);border-color:rgba(255,255,255,0.2);}

        /* ── STATS ── */
        .stats{
          display:flex;gap:0;margin-top:72px;
          border:1px solid var(--border);
          background:var(--bg2);
          max-width:560px;
        }
        .stat{
          flex:1;padding:24px 28px;
          border-right:1px solid var(--border);
        }
        .stat:last-child{border-right:none;}
        .stat-num{
          font-family:'Syne',sans-serif;font-size:36px;font-weight:800;
          color:var(--green);line-height:1;margin-bottom:6px;
        }
        .stat-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}

        /* ── SECTION COMMONS ── */
        section{padding:96px 48px;border-top:1px solid var(--border);}
        .section-tag{
          font-size:10px;letter-spacing:4px;text-transform:uppercase;
          color:var(--red);margin-bottom:16px;
          display:flex;align-items:center;gap:10px;
        }
        .section-tag::before{content:'';width:24px;height:1px;background:var(--red);}
        h2{
          font-family:'Syne',sans-serif;font-size:clamp(36px,4vw,56px);
          font-weight:800;text-transform:uppercase;letter-spacing:-1px;
          line-height:1;margin-bottom:48px;
        }

        /* ── TERMINAL ── */
        .terminal-wrap{max-width:820px;margin:0 auto;}
        .terminal{
          background:#050805;
          border:1px solid rgba(255,255,255,0.06);
          overflow:hidden;
        }
        .term-bar{
          background:#0d0d0f;
          border-bottom:1px solid rgba(255,255,255,0.06);
          padding:12px 18px;
          display:flex;align-items:center;gap:8px;
        }
        .tdot{width:11px;height:11px;border-radius:50%;}
        .tdot.r{background:#ff5f57;} .tdot.y{background:#ffbd2e;} .tdot.g{background:#28c940;}
        .term-title{flex:1;text-align:center;font-size:11px;letter-spacing:2px;color:var(--muted);}
        .term-body{padding:28px 28px;font-size:13px;line-height:2.1;}
        .tl{display:flex;gap:10px;opacity:0;animation:fadeIn 0.3s ease forwards;}
        @keyframes fadeIn{to{opacity:1}}
        .tp{color:#3f3f46;} .tc{color:#e4e4e7;} .tok{color:#22c55e;}
        .tdead{color:var(--red);font-weight:500;} .twarn{color:#f59e0b;}
        .tdim{color:#27272a;}
        .d1{animation-delay:.4s}.d2{animation-delay:.9s}.d3{animation-delay:1.2s}
        .d4{animation-delay:1.5s}.d5{animation-delay:1.8s}.d6{animation-delay:2.1s}
        .d7{animation-delay:2.4s}.d8{animation-delay:2.7s}.d9{animation-delay:3.0s}
        .d10{animation-delay:3.3s}.d11{animation-delay:3.6s}.d12{animation-delay:3.9s}
        .d13{animation-delay:4.2s}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}

        /* ── ROUTE TABLE ── */
        .rtable{border:1px solid var(--border);overflow:hidden;max-width:900px;margin:0 auto;}
        .rhead{
          display:grid;grid-template-columns:90px 1fr 150px 90px 110px;
          padding:12px 24px;background:var(--bg2);
          border-bottom:1px solid var(--border);
          font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);
        }
        .rrow{
          display:grid;grid-template-columns:90px 1fr 150px 90px 110px;
          padding:16px 24px;border-bottom:1px solid #0f0f10;
          align-items:center;font-size:13px;
          transition:background 0.15s;
        }
        .rrow:last-child{border-bottom:none;}
        .rrow:hover{background:var(--bg2);}
        .rrow.dead-row{background:rgba(232,39,26,0.03);}
        .rrow.dead-row:hover{background:rgba(232,39,26,0.06);}
        .badge{
          font-size:10px;font-weight:500;padding:3px 8px;letter-spacing:1px;
          text-transform:uppercase;border:1px solid;width:fit-content;
        }
        .badge-get{color:#22c55e;border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);}
        .badge-post{color:#60a5fa;border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.08);}
        .badge-del{color:var(--red);border-color:rgba(232,39,26,0.3);background:rgba(232,39,26,0.08);}
        .badge-patch{color:#a78bfa;border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.08);}
        .rpath{font-size:13px;color:#e4e4e7;}
        .rpath.is-dead{color:var(--red);}
        .rhit-time{font-size:12px;color:var(--muted);}
        .rhit-time.danger{color:var(--red);}
        .rhits{font-size:13px;text-align:right;color:#e4e4e7;}
        .rhits.zero{color:var(--red);}
        .status-dead{
          font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;
          color:var(--red);border:1px solid rgba(232,39,26,0.4);
          padding:3px 10px;text-align:center;text-transform:uppercase;
          background:rgba(232,39,26,0.08);
        }
        .status-ok{font-size:11px;color:#3f3f46;letter-spacing:1px;text-transform:uppercase;}

        /* ── FEATURES ── */
        .feat-grid{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
          gap:1px;background:var(--border);border:1px solid var(--border);
          max-width:1100px;margin:0 auto;
        }
        .feat{background:var(--bg);padding:40px 36px;transition:background 0.2s;position:relative;}
        .feat:hover{background:var(--bg2);}
        .feat::after{
          content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,var(--red),transparent);
          opacity:0;transition:opacity 0.3s;
        }
        .feat:hover::after{opacity:1;}
        .feat-icon{
          width:36px;height:36px;background:var(--red-glow);border:1px solid rgba(232,39,26,0.2);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;margin-bottom:20px;
        }
        .feat-title{
          font-family:'Syne',sans-serif;font-size:18px;font-weight:700;
          color:var(--text);margin-bottom:10px;letter-spacing:0.5px;
        }
        .feat-desc{font-size:12px;color:var(--muted);line-height:1.9;letter-spacing:0.3px;}

        /* ── HOW ── */
        .how-grid{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:0;border:1px solid var(--border);max-width:960px;margin:0 auto;
        }
        .how-step{
          padding:40px 32px;border-right:1px solid var(--border);
          position:relative;
        }
        .how-step:last-child{border-right:none;}
        .how-num{
          font-family:'Syne',sans-serif;font-size:56px;font-weight:800;
          color:rgba(232,39,26,0.12);line-height:1;margin-bottom:16px;
        }
        .how-title{
          font-family:'Syne',sans-serif;font-size:16px;font-weight:700;
          text-transform:uppercase;letter-spacing:1px;
          margin-bottom:10px;color:var(--text);
        }
        .how-desc{font-size:12px;color:var(--muted);line-height:1.9;}

        /* ── PRICING ── */
        .price-grid{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:1px;background:var(--border);border:1px solid var(--border);
          max-width:900px;margin:0 auto;
        }
        .price-card{background:var(--bg);padding:44px 36px;position:relative;}
        .price-card.featured{background:var(--bg2);}
        .price-card.featured::before{
          content:'MOST POPULAR';position:absolute;top:0;right:0;
          background:var(--red);color:#fff;font-size:9px;letter-spacing:2px;
          padding:4px 12px;
        }
        .price-name{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;}
        .price-amount{
          font-family:'Syne',sans-serif;font-size:64px;font-weight:800;
          line-height:1;color:var(--text);margin-bottom:4px;
        }
        .price-period{font-size:11px;color:var(--muted);letter-spacing:2px;margin-bottom:36px;}
        .price-list{list-style:none;margin-bottom:36px;}
        .price-list li{
          font-size:12px;color:var(--muted);
          padding:7px 0;border-bottom:1px solid #111113;
          display:flex;align-items:center;gap:8px;
        }
        .price-list li::before{content:'→';color:var(--red);flex-shrink:0;}
        .price-btn{
          display:block;width:100%;padding:13px;text-align:center;
          font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;
          text-transform:uppercase;border:1px solid var(--border);
          color:var(--muted);transition:all 0.2s;cursor:pointer;background:transparent;
        }
        .price-btn:hover,.price-card.featured .price-btn{
          background:var(--red);color:#fff;border-color:var(--red);
          box-shadow:0 4px 24px rgba(232,39,26,0.3);
        }

        /* ── CTA BAND ── */
        .cta-band{
          padding:96px 48px;text-align:center;
          border-top:1px solid var(--border);
          position:relative;overflow:hidden;
        }
        .cta-band::before{
          content:'';position:absolute;
          top:50%;left:50%;transform:translate(-50%,-50%);
          width:600px;height:600px;border-radius:50%;
          background:radial-gradient(circle,rgba(232,39,26,0.06) 0%,transparent 70%);
          pointer-events:none;
        }
        .cta-band h2{margin-bottom:20px;}
        .cta-band p{font-size:14px;color:var(--muted);max-width:460px;margin:0 auto 40px;line-height:1.9;}

        /* ── MARQUEE ── */
        .marquee{overflow:hidden;padding:16px 0;background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
        @keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .marquee-track{display:flex;animation:slide 18s linear infinite;white-space:nowrap;}
        .marquee-item{
          font-family:'Syne',sans-serif;font-size:13px;font-weight:700;
          letter-spacing:3px;text-transform:uppercase;
          color:var(--muted);padding:0 32px;
          display:flex;align-items:center;gap:32px;
        }
        .marquee-item span{color:var(--red);font-size:10px;}

        /* ── FOOTER ── */
        footer{
          padding:40px 48px;border-top:1px solid var(--border);
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;
        }
        .footer-logo{
          font-family:'Syne',sans-serif;font-size:16px;font-weight:800;
          letter-spacing:3px;text-transform:uppercase;color:var(--muted);
          display:flex;align-items:center;gap:8px;
        }
        .footer-links{display:flex;gap:28px;list-style:none;flex-wrap:wrap;}
        .footer-links a{font-size:11px;letter-spacing:1px;color:#3f3f46;transition:color 0.2s;text-transform:uppercase;}
        .footer-links a:hover{color:var(--muted);}
        .footer-copy{font-size:11px;color:#3f3f46;letter-spacing:0.5px;}

        @media(max-width:768px){
          nav{padding:0 20px;}
          .nav-links{display:none;}
          .hero{padding:100px 20px 60px;}
          section{padding:64px 20px;}
          .cta-band{padding:64px 20px;}
          footer{padding:32px 20px;}
          .rhead,.rrow{grid-template-columns:72px 1fr 90px 80px;}
          .rrow>:nth-child(4),.rhead>:nth-child(4){display:none;}
        }
      `}</style>

      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo"><span className="skull">☠</span> DeadRoute</a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/login">Docs</a></li>
          <li><a href="/login">Sign in</a></li>
        </ul>
        <a href="/signup" className="nav-cta">Start Free Trial</a>
      </nav>

      {/* HERO */}
      <section className="hero" style={{borderTop:"none"}}>
        <canvas ref={canvasRef} />
        <div className="hero-inner">
          <div className="hero-eyebrow"><span className="dot"></span>Production API Monitoring</div>
          <h1>
            <span className="line-white">Kill Your</span>
            <span className="line-red">Dead Code</span>
          </h1>
          <p className="hero-desc">
            Monitor every API endpoint in production.<br/>
            Identify unused routes. Delete with confidence.<br/>
            Stop maintaining code nobody uses.
          </p>
          <div className="hero-btns">
            <a href="/signup" className="btn-red">Start Monitoring Free</a>
            <a href="#how" className="btn-ghost">View Docs →</a>
          </div>
          <div className="stats">
            {[["847","Dead Routes Found"],["12.3K","Lines Deleted"],["94%","Coverage Rate"]].map(([n,l])=>(
              <div key={l} className="stat">
                <div className="stat-num">{n}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-track">
          {["Express","FastAPI","Django","Flask","Rails","Fastify","Next.js","Sinatra","Koa","Laravel",
            "Express","FastAPI","Django","Flask","Rails","Fastify","Next.js","Sinatra","Koa","Laravel"].map((f,i)=>(
            <span key={i} className="marquee-item">{f}<span>☠</span></span>
          ))}
        </div>
      </div>

      {/* TERMINAL DEMO */}
      <section>
        <div className="section-tag">Live Dashboard</div>
        <h2>Real-Time<br/>Endpoint Monitor</h2>
        <div className="terminal-wrap">
          <div className="terminal">
            <div className="term-bar">
              <div className="tdot r"/><div className="tdot y"/><div className="tdot g"/>
              <div className="term-title">deadroute — api.yourapp.com — monitoring active</div>
            </div>
            <div className="term-body">
              <div className="tl d1"><span className="tp">$</span><span className="tc">deadroute scan --project=my-api --threshold=30d</span></div>
              <div className="tl d2"><span className="tok">  ✓ Authenticated — project: my-api</span></div>
              <div className="tl d3"><span className="tok">  ✓ Scanning 24 registered endpoints...</span></div>
              <div className="tl d4"><span className="tdim">  ─────────────────────────────────────────────</span></div>
              <div className="tl d5"><span className="tok">  ✓ GET    /api/v1/users           12,847 hits · 2 min ago</span></div>
              <div className="tl d6"><span className="tok">  ✓ POST   /api/v1/auth/login      45,293 hits · 5 sec ago</span></div>
              <div className="tl d7"><span className="tok">  ✓ GET    /api/v1/products         8,432 hits · 1 hr ago</span></div>
              <div className="tl d8"><span className="tdead">  ☠ DELETE /api/v1/legacy/export       0 hits · 87 days ago  ← DEAD</span></div>
              <div className="tl d9"><span className="tdead">  ☠ POST   /api/v2/old-checkout        3 hits · 124 days ago ← DEAD</span></div>
              <div className="tl d10"><span className="twarn">  ⚠ GET    /api/v1/reports/weekly     12 hits · 45 days ago  ← FLAGGED</span></div>
              <div className="tl d11"><span className="tdim">  ─────────────────────────────────────────────</span></div>
              <div className="tl d12"><span className="tdead">  RESULT  2 dead routes · 1 flagged · 847 lines ready to delete</span></div>
              <div className="tl d13"><span className="tp">$</span><span className="tc"> <span className="cursor">█</span></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ROUTE TABLE */}
      <section>
        <div className="section-tag">Dashboard Preview</div>
        <h2>Every Route.<br/>Every Hit.</h2>
        <div className="rtable">
          <div className="rhead"><div>Method</div><div>Route</div><div>Last Hit</div><div style={{textAlign:"right"}}>Hits</div><div>Status</div></div>
          {[
            {badge:"badge-get",m:"GET",path:"/api/v1/users",last:"2 min ago",hits:"12,847",dead:false},
            {badge:"badge-post",m:"POST",path:"/api/v1/auth/login",last:"5 sec ago",hits:"45,293",dead:false},
            {badge:"badge-get",m:"GET",path:"/api/v1/products",last:"1 hr ago",hits:"8,432",dead:false},
            {badge:"badge-post",m:"POST",path:"/api/v1/orders",last:"30 min ago",hits:"1,823",dead:false},
            {badge:"badge-del",m:"DELETE",path:"/api/v1/legacy/export",last:"87 days ago",hits:"0",dead:true},
            {badge:"badge-post",m:"POST",path:"/api/v2/old-checkout",last:"124 days ago",hits:"3",dead:true},
          ].map((r,i)=>(
            <div key={i} className={`rrow${r.dead?" dead-row":""}`}>
              <div><span className={`badge ${r.badge}`}>{r.m}</span></div>
              <div className={`rpath${r.dead?" is-dead":""}`}>{r.path}</div>
              <div className={`rhit-time${r.dead?" danger":""}`}>{r.last}</div>
              <div className={`rhits${r.hits==="0"?" zero":""}`}>{r.hits}</div>
              {r.dead?<div className="status-dead">☠ Dead</div>:<div className="status-ok">Active</div>}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="section-tag">How It Works</div>
        <h2>Up In 5 Minutes.</h2>
        <div className="how-grid">
          {[
            ["01","Install SDK","One middleware line. Express, FastAPI, Django, Rails. Less than 0.1ms overhead added to your requests."],
            ["02","Monitor","Every endpoint hit is recorded — timestamps, hit counts, status codes, response times. All async."],
            ["03","Detect","Routes inactive for 30+ days are flagged automatically. AI distinguishes seasonal from truly dead."],
            ["04","Delete","Flag for deletion, open the PR, ship it. Less code. Smaller surface area. Less maintenance forever."],
          ].map(([n,t,d])=>(
            <div key={n} className="how-step">
              <div className="how-num">{n}</div>
              <div className="how-title">{t}</div>
              <p className="how-desc">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="section-tag">Features</div>
        <h2>Everything You Need<br/>To Delete Safely.</h2>
        <div className="feat-grid">
          {[
            ["📊","Real-Time Tracking","Monitor every endpoint hit in production. Track usage patterns, response times, and error rates with millisecond precision."],
            ["🎯","Smart Detection","AI-powered analysis identifies truly unused routes vs seasonal endpoints. Customizable thresholds for your business logic."],
            ["⚡","Zero Performance Impact","Async middleware with less than 0.1ms overhead. No effect on response times. Optional sampling for high-traffic APIs."],
            ["🔗","Multi-Framework SDK","Works with Express, FastAPI, Flask, Django, Rails, Sinatra. One-line setup. Framework-agnostic REST API also available."],
            ["🔔","Smart Alerts","Slack, Discord, or email when endpoints go unused. Configurable per-project thresholds. Team collaboration built in."],
            ["🔑","Secure by Default","API keys stored as SHA-256 hashes. Rate limiting on all routes. Keys shown once at creation — just like GitHub tokens."],
          ].map(([icon,title,desc])=>(
            <div key={title as string} className="feat">
              <div className="feat-icon">{icon}</div>
              <div className="feat-title">{title as string}</div>
              <p className="feat-desc">{desc as string}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="section-tag">Pricing</div>
        <h2>Simple Pricing.<br/>No Surprises.</h2>
        <div className="price-grid">
          {[
            {name:"Starter",price:"$0",period:"/ month — free forever",featured:false,
              features:["Up to 50 endpoints","30 days data retention","Basic analytics","Community support"],
              btn:"Start Free",href:"/signup"},
            {name:"Pro",price:"$49",period:"/ month",featured:true,
              features:["Unlimited endpoints","1 year data retention","Advanced analytics","GitHub integration","Slack notifications","Priority support"],
              btn:"Start Trial",href:"/signup"},
            {name:"Enterprise",price:"—",period:"custom pricing",featured:false,
              features:["Everything in Pro","Self-hosted option","Unlimited retention","Custom integrations","SLA guarantee","Dedicated support"],
              btn:"Contact Sales",href:"mailto:hello@deadroute.dev"},
          ].map((p)=>(
            <div key={p.name} className={`price-card${p.featured?" featured":""}`}>
              <div className="price-name">{p.name}</div>
              <div className="price-amount">{p.price}</div>
              <div className="price-period">{p.period}</div>
              <ul className="price-list">{p.features.map(f=><li key={f}>{f}</li>)}</ul>
              <a href={p.href} className="price-btn">{p.btn}</a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <div className="cta-band">
        <div className="section-tag" style={{justifyContent:"center"}}>Get Started</div>
        <h2>Stop Maintaining<br/>Dead Code</h2>
        <p>Join 1,200+ developers who've deleted over 50,000 unused endpoints. Start monitoring in under 5 minutes.</p>
        <a href="/signup" className="btn-red" style={{display:"inline-flex",fontSize:"14px",padding:"16px 40px"}}>
          Start Free Trial →
        </a>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo"><span style={{color:"var(--red)"}}>☠</span> DeadRoute</div>
        <ul className="footer-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/login">Login</a></li>
          <li><a href="/signup">Sign up</a></li>
        </ul>
        <div className="footer-copy">© 2026 DeadRoute · Built for developers who hate dead code</div>
      </footer>
    </>
  );
}
