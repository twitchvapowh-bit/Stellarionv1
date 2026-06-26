# Stellarion

Projet MMO navigateur.

## Alpha 1.5.45 — Messagerie destinataire

Ajout : champ destinataire avec répertoire/autocomplete des joueurs depuis la table Supabase `players`.

Pour que les messages soient réellement livrés entre joueurs, lancer `SUPABASE_MESSAGES_SETUP.sql` dans Supabase si la table `messages` n'existe pas encore.
Sans cette table, l'interface reste stable mais le message est seulement conservé localement avec un avertissement dans le journal.
