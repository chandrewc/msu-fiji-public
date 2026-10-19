# Sigma Mu Public Chapter Website

Public-facing Phi Gamma Delta Sigma Mu website for Mississippi State University.

- Built for GitHub Pages with plain HTML, CSS and JavaScript.
- Uses the same visual language as the Sigma Mu Brother Network, but has separate source code and hosting.
- No authentication, database or personal information collection is included in this initial version.
- Graduate Network links point to https://chandrewc.github.io/msu-fiji-database/.

## Publish with GitHub Pages

In repository **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then Save. The expected website URL is https://chandrewc.github.io/msu-fiji-public/ after GitHub Pages publishes it.

## Edit

- `index.html`: text, navigation, sections and links.
- `styles.css`: maroon (#5D1725) and visual design.
- `script.js`: mobile menu behavior.

Do not place private Supabase credentials in public frontend code. If future content management is needed, use restricted tables and Row Level Security in the existing Supabase project.
