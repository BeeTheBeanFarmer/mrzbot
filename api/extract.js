// Vercel Serverless Function to extract contract address from mint pages
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Fetch the mint page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to fetch page' });
        }

        const html = await response.text();

        // Patterns to find contract addresses
        const patterns = [
            // Direct contract address in various formats
            /contract["\s:=]+["']?(0x[a-fA-F0-9]{40})["']?/gi,
            /address["\s:=]+["']?(0x[a-fA-F0-9]{40})["']?/gi,
            /contractAddress["\s:=]+["']?(0x[a-fA-F0-9]{40})["']?/gi,
            /nftContract["\s:=]+["']?(0x[a-fA-F0-9]{40})["']?/gi,
            /mintContract["\s:=]+["']?(0x[a-fA-F0-9]{40})["']?/gi,
            // Etherscan links
            /etherscan\.io\/address\/(0x[a-fA-F0-9]{40})/gi,
            /basescan\.org\/address\/(0x[a-fA-F0-9]{40})/gi,
            /arbiscan\.io\/address\/(0x[a-fA-F0-9]{40})/gi,
            /optimistic\.etherscan\.io\/address\/(0x[a-fA-F0-9]{40})/gi,
            /polygonscan\.com\/address\/(0x[a-fA-F0-9]{40})/gi,
            // OpenSea links
            /opensea\.io\/assets\/ethereum\/(0x[a-fA-F0-9]{40})/gi,
            /opensea\.io\/assets\/base\/(0x[a-fA-F0-9]{40})/gi,
            // Generic 0x address (last resort)
            /(0x[a-fA-F0-9]{40})/gi
        ];

        const foundAddresses = new Set();
        const addressContext = [];

        for (const pattern of patterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
                const address = match[1] || match[0];
                if (address && address.startsWith('0x') && address.length === 42) {
                    foundAddresses.add(address.toLowerCase());

                    // Get context around the match
                    const index = match.index;
                    const start = Math.max(0, index - 50);
                    const end = Math.min(html.length, index + 100);
                    const context = html.slice(start, end).replace(/\s+/g, ' ').trim();

                    addressContext.push({
                        address: address.toLowerCase(),
                        context: context.slice(0, 100)
                    });
                }
            }
        }

        // Filter out common non-contract addresses (null address, common tokens, etc.)
        const excludeAddresses = [
            '0x0000000000000000000000000000000000000000',
            '0x000000000000000000000000000000000000dead',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        ];

        const filteredAddresses = Array.from(foundAddresses)
            .filter(addr => !excludeAddresses.includes(addr));

        // Score addresses based on context
        const scoredAddresses = filteredAddresses.map(addr => {
            let score = 0;
            const contexts = addressContext.filter(c => c.address === addr);

            for (const ctx of contexts) {
                const ctxLower = ctx.context.toLowerCase();
                if (ctxLower.includes('contract')) score += 10;
                if (ctxLower.includes('mint')) score += 10;
                if (ctxLower.includes('nft')) score += 5;
                if (ctxLower.includes('address')) score += 3;
                if (ctxLower.includes('etherscan')) score += 8;
            }

            return { address: addr, score, contexts: contexts.slice(0, 2) };
        }).sort((a, b) => b.score - a.score);

        return res.status(200).json({
            success: true,
            addresses: scoredAddresses.slice(0, 5),
            bestGuess: scoredAddresses[0]?.address || null
        });

    } catch (error) {
        console.error('Extract error:', error);
        return res.status(500).json({
            error: 'Failed to extract contract',
            message: error.message
        });
    }
}
