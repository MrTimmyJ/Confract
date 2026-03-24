# Confract — AI Knowledge Consolidation Engine

A self-hosted, zero-cost AI document analysis engine that transforms raw information into structured knowledge using local transformer models.

**Author**: Timothy Johnson  
**Date**: February 2026

**Live Demo**: 
- 📄 **Confract**: http://143.198.51.64/confract/

Key Features: Self-hosted · No external API · No per-request cost · No user accounts

## 🌟 Overview

Confract is an intelligent knowledge consolidation system that uses local AI models to analyze, structure, and connect information from raw text inputs. Unlike cloud-based solutions, it runs entirely on your infrastructure with zero ongoing costs and complete data privacy.

## ✨ Features

### 🤖 Local AI Processing
- **Zero API Costs**: Runs entirely with local transformer models
- **Privacy-First**: All data stays on your server
- **Offline Capable**: No internet connection required after initial setup

### 📄 Intelligent Document Analysis
- **Entity Detection**: Identifies key concepts, people, organizations, and themes
- **Relation Mapping**: Discovers connections between extracted entities
- **Document Consolidation**: Merges related information from multiple sources

### 🔍 Context-Aware Processing
- **Semantic Understanding**: Analyzes meaning beyond keyword matching
- **Existing Document Integration**: Enriches and updates existing knowledge
- **Similarity Detection**: Identifies related content across document collections

### 🚀 Production-Ready Architecture
- **Express Backend**: Fast, lightweight Node.js server
- **HuggingFace Transformers**: State-of-the-art local AI models
- **Health Monitoring**: Built-in service health checks

## 🏗️ Architecture

## Structure

```
confract/
├── server.js       ← Express backend (change port here)
├── engine.js       ← AI engine (HuggingFace transformer)
├── package.json
└── public/         ← everything served to the browser
    ├── index.html  ← landing page
    ├── confract.html ← the app
    ├── style.css   ← shared styles
    └── script.js   ← app JavaScript
```

### API Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/process` | POST | Process raw text into structured document | `{"input": "raw text", "existingDoc": null \| docObject}` | JSON with processed document |
| `/api/detect` | POST | Detect relationships with existing documents | { input: "raw text", docs: [...] } | JSON with similarity analysis |
| `/api/health` | GET | Service health check | None | Service status |

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip package manager

### Installation

1. Clone the repository:

    git clone https://github.com/MrTimmyJ/Next-Novel.git
    cd next-novel

2. Install dependencies:

    cd backend
    python3 -m venv venv
    source venv/bin/activate  # Mac/Linux
    # venv\Scripts\activate   # Windows
    
    pip install -r requirements.txt
    python app.py

3. Host locally:

   Backend: python app.py
   Frontend: python3 -m http.server 8000

🪪 License

© 2026 Timothy Johnson. All Rights Reserved.<br>
This project and its code may not be copied, modified, or reused without permission.

