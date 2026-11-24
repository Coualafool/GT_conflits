# -*- coding: utf-8 -*-
"""Bloc commun « quiz » — style des self-checks de fin de séquence.

Le style est commun (toutes les pages à accordéons) ; le CONTENU s'insère
au cas par cas dans les séquences (pilote : chapitre 2, novembre 2026).
Format d'un quizlet :

  <details class="quiz">
    <summary>✅ Vérifiez ce que vous retenez</summary>
    <ol class="q">
      <li>Question&nbsp;?
        <details class="rep"><summary>Vérifier</summary><p>Réponse + pourquoi.</p></details>
      </li>
    </ol>
  </details>

Règles rédactionnelles : 3 questions max par séquence ; compréhension et
application plutôt que restitution ; chaque réponse cite ou reformule un
élévement sourcé de la séquence (jamais une info extérieure).
"""

QUIZ_BLOCK = """<!-- BEGIN commun:quiz -->
<style>
  details.quiz{margin:20px 0 6px;border:1px solid var(--border);border-left:4px solid var(--good);border-radius:10px;background:var(--panel-2)}
  details.quiz>summary{cursor:pointer;padding:11px 16px;font-weight:700;font-size:14.5px;color:var(--good);list-style:none}
  details.quiz>summary::-webkit-details-marker{display:none}
  details.quiz[open]>summary{border-bottom:1px solid var(--border)}
  ol.q{margin:10px 0 14px;padding:0 18px 0 42px}
  ol.q>li{margin:12px 0;font-size:14.5px;color:var(--ink);line-height:1.55}
  details.rep{margin:7px 0}
  details.rep>summary{cursor:pointer;font-size:13.5px;color:var(--accent);list-style:none;display:inline-flex;gap:6px;align-items:center}
  details.rep>summary::-webkit-details-marker{display:none}
  details.rep>summary::before{content:"▸";font-size:11px;transition:transform .15s}
  details.rep[open]>summary::before{transform:rotate(90deg)}
  details.rep>summary:hover{text-decoration:underline}
  details.rep p{margin:7px 0 4px;font-size:14px;color:var(--muted);border-left:2px solid var(--border);padding-left:12px}
  @media print{details.quiz,details.rep{border:none}details.quiz{display:none}}
</style>
<!-- END commun:quiz -->"""
