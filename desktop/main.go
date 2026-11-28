// Yak-élec-pro – lanceur Windows : sert l'application (hors ligne) sur 127.0.0.1 et l'ouvre
// dans une fenêtre d'application (Microsoft Edge / Chrome déjà présents sur Windows 10 et 11).
// Aucune connexion Internet requise. Se ferme tout seul quand la fenêtre est fermée.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed app.html
var page []byte

const port = 47615 // port fixe : le navigateur conserve ainsi les comptes et projets (localStorage)

var lastPing int64 // horodatage (ns) du dernier signal de vie de la page
var seen int32     // 1 dès que la page a signalé sa présence

const beat = `<script>(function(){function p(){try{fetch('/__alive',{cache:'no-store'})}catch(e){}}p();setInterval(p,4000)})()</script>`

func browsers() []string {
	pf, pf86, la := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LocalAppData")
	var c []string
	for _, b := range []string{pf86, pf, la} {
		if b != "" {
			c = append(c, filepath.Join(b, `Microsoft\Edge\Application\msedge.exe`))
		}
	}
	for _, b := range []string{pf, pf86, la} {
		if b != "" {
			c = append(c, filepath.Join(b, `Google\Chrome\Application\chrome.exe`))
		}
	}
	return c
}

func profileDir() string {
	base := os.Getenv("LocalAppData")
	if base == "" {
		base, _ = os.UserConfigDir()
	}
	d := filepath.Join(base, "Yak-elec-pro", "profil")
	_ = os.MkdirAll(d, 0o755)
	return d
}

func openWindow(url string) {
	if os.Getenv("YAK_NOBROWSER") != "" {
		return
	}
	if runtime.GOOS == "windows" {
		for _, b := range browsers() {
			if _, err := os.Stat(b); err == nil {
				cmd := exec.Command(b, "--app="+url, "--user-data-dir="+profileDir(), "--no-first-run", "--no-default-browser-check", "--window-size=1366,820")
				if cmd.Start() == nil {
					return
				}
			}
		}
		// repli : navigateur par défaut
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		return
	}
	for _, o := range []string{"xdg-open", "open"} {
		if p, err := exec.LookPath(o); err == nil {
			_ = exec.Command(p, url).Start()
			return
		}
	}
}

func main() {
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil { // déjà lancé : on rouvre simplement une fenêtre
		openWindow(url)
		return
	}
	// insertion avant la DERNIÈRE balise </body> (la vraie fin de page) : une balise </body>
	// écrite dans le code JavaScript (impression, rapports) ne doit jamais être modifiée.
	html := string(page)
	if i := strings.LastIndex(html, "</body>"); i >= 0 {
		html = html[:i] + beat + html[i:]
	} else {
		html += beat
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/__alive", func(w http.ResponseWriter, r *http.Request) {
		atomic.StoreInt64(&lastPing, time.Now().UnixNano())
		atomic.StoreInt32(&seen, 1)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprint(w, html)
	})
	go http.Serve(ln, mux)
	openWindow(url)
	start := time.Now()
	for {
		time.Sleep(2 * time.Second)
		if atomic.LoadInt32(&seen) == 0 {
			if time.Since(start) > 60*time.Second {
				return
			}
			continue
		}
		if time.Since(time.Unix(0, atomic.LoadInt64(&lastPing))) > 15*time.Second {
			return
		}
	}
}
