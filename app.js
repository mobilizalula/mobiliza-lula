let map = null;
let todosProtestos = [];
let marcadores = null;

const iconeEstrelaVermelha = L.divIcon({
    className: 'custom-star-marker',
    html: `
        <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(2px 2px 0px #000); transform: translate(-4px, -4px);">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" 
                fill="#dc2626" 
                stroke="#000000" 
                stroke-width="1.5"/>
        </svg>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const iconeEstrelaCinza = L.divIcon({
    className: 'custom-star-marker',
    html: `
        <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(2px 2px 0px #000); transform: translate(-4px, -4px);">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" 
                fill="#64748b" 
                stroke="#000000" 
                stroke-width="1.5"/>
        </svg>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function renderizarLista(protestosParaRenderizar) {
    const listaDiv = document.getElementById('lista-protestos');
    listaDiv.innerHTML = '';
    if (marcadores) marcadores.clearLayers(); 

    const agora = new Date();
    const dataHojeZero = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    const protestosAtivos = protestosParaRenderizar.filter(local => {
        const [ano, mes, dia] = local.data.split('-');
        const dataEventoZero = new Date(ano, mes - 1, dia);
        return dataEventoZero >= dataHojeZero;
    });

    if (protestosAtivos.length === 0) {
        listaDiv.innerHTML = '<p class="text-white text-center mt-10 text-xl font-bold">NENHUM ATO ENCONTRADO.</p>';
        return;
    }

    protestosAtivos.sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.hora}:00`);
        const dataB = new Date(`${b.data}T${b.hora}:00`);
        return dataA - dataB;
    });

    protestosAtivos.forEach(local => {
        const [ano, mes, dia] = local.data.split('-');
        const dataFormatada = `${dia}/${mes}/${ano} - ${local.hora}`;

        const dataHoraEvento = new Date(`${local.data}T${local.hora}:00`);
        const jaPassou = agora > dataHoraEvento;
        const iconeAtual = jaPassou ? iconeEstrelaCinza : iconeEstrelaVermelha;

        const marker = L.marker([local.lat, local.lng], { icon: iconeAtual });
        
        const statusTextoPopup = jaPassou ? " [EM ANDAMENTO / PASSADO]" : "";
        marker.bindPopup(`<div class="font-bold text-lg">${local.titulo}${statusTextoPopup}</div><div>${dataFormatada}</div>`);
        
        // Caminho inverso: Clicar na estrela do mapa rola até o card correspondente na lista e fecha o modal
        marker.on('click', () => {
            fecharModalMapa();
            const cardEl = document.getElementById(`card-protesto-${local.id}`);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardEl.classList.add('ring-4', 'ring-yellow-400');
                setTimeout(() => {
                    cardEl.classList.remove('ring-4', 'ring-yellow-400');
                }, 1500);
            }
        });

        if (marcadores) marcadores.addLayer(marker);

        let botaoLinkHtml = '';
        if (local.link && local.link !== "N/A" && local.link.trim() !== "") {
            botaoLinkHtml = `
                <a href="${local.link}" target="_blank" onclick="event.stopPropagation()" class="mt-2 block text-center bg-black text-white text-xs font-bold py-2 px-4 border-2 border-black hover:bg-red-700 transition-colors">
                    ACESSAR POST ORIGINAL
                </a>
            `;
        }

        const card = document.createElement('div');
        card.id = `card-protesto-${local.id}`;
        
        const classesCard = jaPassou 
            ? "p-5 bg-slate-200 opacity-75 border-4 border-black sombra-dura transition-all" 
            : "p-5 bg-white border-4 border-black sombra-dura transition-all";
            
        card.className = classesCard;
        
        const badgePassado = jaPassou ? `<span class="text-xs bg-slate-700 text-white px-2 py-0.5 ml-2 font-bold">JÁ INICIOU</span>` : '';

        card.onclick = () => {
            abrirModalMapa();
            if (map) {
                map.flyTo([local.lat, local.lng], 16, { duration: 1.2 });
                marker.openPopup();
            }
        };

        card.innerHTML = `
            <div class="mb-3 border-b-2 border-black pb-2">
                <h3 class="font-bold text-2xl text-black leading-tight">${local.titulo} ${badgePassado}</h3>
            </div>
            <div class="flex flex-col gap-2 mt-3">
                <span class="bg-black text-white text-sm font-bold px-3 py-1 w-fit whitespace-nowrap">${dataFormatada}</span>
                <span class="${jaPassou ? 'text-slate-700' : 'text-red-700'} font-bold tracking-wider">${local.bairro}</span>
            </div>
            <p class="text-gray-700 text-sm mt-3 font-bold">ENDEREÇO: ${local.endereco}</p>
            <p class="text-black font-medium text-md mt-2 leading-tight normal-case">${local.descricao}</p>
            ${botaoLinkHtml}
        `;

        listaDiv.appendChild(card);
    });
}

function abrirModalMapa() {
    const modal = document.getElementById('modal-mapa');
    modal.classList.remove('hidden');
    
    if (!map) {
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-22.9068, -43.1729], 11);
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        marcadores = L.featureGroup().addTo(map);
        renderizarLista(todosProtestos);
    } else {
        map.invalidateSize();
    }

    if (marcadores && marcadores.getLayers().length > 0) {
        map.fitBounds(marcadores.getBounds(), { padding: [40, 40] });
    }
}

function fecharModalMapa() {
    const modal = document.getElementById('modal-mapa');
    modal.classList.add('hidden');
}

function filtrarHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHojeStr = `${ano}-${mes}-${dia}`;

    const protestosHoje = todosProtestos.filter(p => p.data === dataHojeStr);

    document.getElementById('filtro-bairro').classList.remove('hidden');
    document.getElementById('nome-bairro-selecionado').innerText = "ATOS DE HOJE";
    
    renderizarLista(protestosHoje);
}

function acharMaisPerto() {
    if (!navigator.geolocation) return alert("SEM SUPORTE A GPS.");

    navigator.geolocation.getCurrentPosition(pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        let maisPerto = null;
        let menorDistancia = Infinity;

        todosProtestos.forEach(p => {
            const dist = calcularDistancia(userLat, userLng, p.lat, p.lng);
            if (dist < menorDistancia) {
                menorDistancia = dist;
                maisPerto = p;
            }
        });

        if (maisPerto) {
            document.getElementById('filtro-bairro').classList.remove('hidden');
            document.getElementById('nome-bairro-selecionado').innerText = "MAIS PRÓXIMO DE VOCÊ";
            renderizarLista([maisPerto]); 
            
            abrirModalMapa();
            setTimeout(() => {
                if (map) {
                    map.flyTo([maisPerto.lat, maisPerto.lng], 16);
                }
            }, 300);
            
            L.circleMarker([userLat, userLng], { color: '#000', weight: 6, fillColor: '#fff', fillOpacity: 1, radius: 8 })
             .addTo(map)
             .bindPopup("<b style='color:black'>VOCÊ ESTÁ AQUI</b>")
             .openPopup();
        }
    }, () => alert("PERMISSÃO DE GPS NEGADA."));
}

function limparFiltro() {
    document.getElementById('filtro-bairro').classList.add('hidden');
    renderizarLista(todosProtestos);
}

async function inicializar() {
    try {
        const resDados = await fetch('./dados.json');
        todosProtestos = await resDados.json();
        renderizarLista(todosProtestos);
    } catch (error) {
        document.getElementById('lista-protestos').innerHTML = '<p class="text-white font-bold text-center">ERRO DE CONEXÃO.</p>';
    }
}

inicializar();