import {useState, FormEvent, useEffect} from 'react';
import "./App.css";
import cytoscape, { ElementsDefinition, Stylesheet } from 'cytoscape';
import {DARK_THEME_KEY, LIGHT_THEME_KEY, LOCALSTORAGE_THEME_KEY} from "./constants.ts";
import {toggleTheme} from "./toggleTheme.ts";
import Footer from "./Footer.tsx";
import StatusBar from "./StatusBar.tsx";


interface Metadata {
    createdDate: string;
    lastUpdated: string;
    description: string;
}

interface Node {
    id: string;
    label: string;
    type: string;
    color: string;
    wiki: string;
}

interface Edge {
    from: string;
    to: string;
    relationship: string;
    direction: string;
    color: string;
}

interface ResponseData {
    metadata: Metadata;
    nodes: Node[];
    edges: Edge[];
}

export default function App() {
    const [hover, setHover] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInput, setUserInput] = useState<string>('');
    const [generated, setGenerated] = useState<boolean>(false);
    const [theme, setTheme] = useState<
        typeof LIGHT_THEME_KEY | typeof DARK_THEME_KEY
    >(
        (localStorage.getItem(LOCALSTORAGE_THEME_KEY) as
            | typeof LIGHT_THEME_KEY
            | typeof DARK_THEME_KEY) || LIGHT_THEME_KEY
    );

    useEffect(() => {
        const userTheme = window.localStorage.getItem(LOCALSTORAGE_THEME_KEY);
        const systemTheme = window.matchMedia(
            `(prefers-color-scheme:${DARK_THEME_KEY})`
        ).matches
            ? DARK_THEME_KEY
            : LIGHT_THEME_KEY;
        document.body.classList.add(userTheme || systemTheme);
        localStorage.setItem(LOCALSTORAGE_THEME_KEY, userTheme || systemTheme);
    }, []);

    const postData = async (url: string, data: object): Promise<ResponseData> => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json();
    };

    interface ServerResponse {
        elements: {
            nodes: Array<{ data: { id: string; label: string, wiki: string, color: string } }>;
            edges: Array<{ data: { source: string; target: string } }>;
        };
    }

    // Function to parse the server response to a Cytoscape-compatible object
    const parseResponseToElements = (graphData: ServerResponse) => {
        const { nodes, edges } = graphData.elements;
        const elements: ElementsDefinition = { nodes: [], edges: [] };

        nodes.forEach((node) => {
            elements.nodes.push({
                data: {
                    icon: 'https://img.icons8.com/emoji/150/fire.png',
                    id: node.data.id,
                    label: node.data.label,
                    gradient: node.data.color,
                    wiki: node.data.wiki
                }
            });
        });

        edges.forEach((edge) => {
            elements.edges.push({
                data: { source: edge.data.source, target: edge.data.target }
            });
        });

        return elements;
    };

    const createGraph = (data: ElementsDefinition) => {
        const cy = cytoscape({
            container: document.getElementById('cy') as HTMLElement,
            elements: data,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-image': 'data(icon)',
                        'background-color': 'data(gradient)',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'font-family': 'Onest-Regular',
                        'background-fit': 'contain',
                        'width': '30px',
                        'height': '30px',
                        'color': theme === LIGHT_THEME_KEY ? '#2D3748' : '#F9FAFB',
                        'border-width': '0.5px',
                        'border-color': '#ccc',
                    }
                },
                {
                    selector: 'node.root',
                    style: {
                        'background-image': 'https://img.icons8.com/stickers/150/dragon.png',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'unbundled-bezier',
                        'width': 1,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ] as Stylesheet[],
            layout: {
                name: 'cose',
            }
        });

        cy.nodes().forEach((node) => {
            const wikiData = node.data('wiki');
            if (wikiData !== "") {
                node.style({
                    'border-color': '#FFD700',
                    'border-width': '1px'
                });
            }
        });

        cy.on('mouseover', 'node', function(evt){
            const node = evt.target;
            const wikiData = node.data('wiki');
            if (wikiData !== "") {
                node.animate({
                    style: { 'border-width': '2px' },
                }, {
                    duration: 100
                });
            }
        });

        cy.on('mouseout', 'node', function(evt){
            const node = evt.target;
            const wikiData = node.data('wiki');
            if (wikiData !== "") {
                node.animate({
                    style: { 'border-width': '1px' },
                }, {
                    duration: 100
                });
            }
        });

        cy.on('tap', 'node', function(evt){
            const nodeData = evt.target.data();
            if (nodeData.wiki) {
                window.open(nodeData.wiki, '_blank');
            }
        });
        const rootNode = cy.nodes().eq(0);
        rootNode.addClass('root');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setGenerated(false);
        setIsLoading(true);

        try {
            await postData('http://localhost:8080/get_response_data', { user_input: userInput });
            setIsLoading(false);
            const graphData = await postData('http://localhost:8080/get_graph_data', {});
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const cytoData = parseResponseToElements(graphData);
            createGraph(cytoData);
            setGenerated(true);
        } catch (error) {
            setIsLoading(false);
            console.error('Fetch Error:', error);
        }
    };

    return (
        <div className={'dark:bg-[#1a1a1a]'}>
            <div className="flex w-full items-center justify-center  bg-black px-3">
                <a
                    className="relative mb-1 mt-1 text-base text-white transition-all hover:text-opacity-80"
                    href={`https://github.com/noahgsolomon/graphzila`}
                    target="_blank"
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                >
                    ⭐ enjoying Graphzila? Leave a star{" "}
                    <span
                        className={`absolute -right-4 text-white transition-all ${
                            hover ? "-right-6 text-opacity-80" : ""
                        }`}
                    >
          →
        </span>
                </a>
            </div>
                <header
                className={`relative z-40 mx-5 mb-20 flex items-center py-5 font-bold transition-all`}
            >
            <div className="mx-auto flex w-full max-w-[50rem] flex-row flex-wrap items-center rounded-xl border-2 border-black px-4 py-3 shadow-custom transition-all dark:bg-[#1a1a1a] justify-between">
                <div className="cursor-pointer select-none flex flex-row px-1 transition-all hover:text-red-500 dark:hover:text-red-500 hover:-translate-y-0.5">
                    <img className={'w-[50px] mr-3'} src={'https://img.icons8.com/stickers/100/dragon.png'} alt={'graphzila'}/> <div className={'flex flex-col transition-all hover:text-red-500 dark:hover:text-red-500 dark:text-gray-50 text-gray-800 '}><h1 className={'text-4xl'}>Graphzila</h1><p className={'text-sm opacity-60'}>Powered by OpenAI</p></div>
                </div>
                <div
                    onClick={() => {
                        toggleTheme();
                        setTheme(
                            (localStorage.getItem(LOCALSTORAGE_THEME_KEY) as
                                | typeof LIGHT_THEME_KEY
                                | typeof DARK_THEME_KEY) || typeof LIGHT_THEME_KEY
                        );
                    }}
                >
                    {theme === LIGHT_THEME_KEY ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 cursor-pointer fill-yellow-500 transition-all hover:opacity-80"
                        >
                            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.844a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06 1.06l1.59-1.591a.75.75 0 00-1.061-1.06l-1.59 1.591z" />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 cursor-pointer fill-yellow-200 transition-all hover:opacity-80"
                        >
                            <path
                                fillRule="evenodd"
                                d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                                clipRule="evenodd"
                            />

                        </svg>
                    )}
                </div>
            </div>
            </header>
            <div className="w-screen">
                <div className="dark:bg-[#1a1a1a] mt-10 p-4">
                    <form id="inputForm" className="mb-4 text-center w-full" onSubmit={handleSubmit}>
                        <label htmlFor="userInput" className="md:ml-20 md:text-left block font-bold text-lg">
                            🐉 Summon Your Dragon Knowledge 🐉
                        </label>
                        <p className="md:text-left mb-2 md:ml-20 opacity-80">
                            Enter a keyword or topic to awaken your dragon's wisdom. The mystical graph will reveal interconnected knowledge and secrets.
                        </p>
                        <div className="flex items-center md:mx-20 justify-center gap-5 md:flex">
                            <input
                                type="text"
                                id="userInput"
                                placeholder="Type here..."
                                maxLength={50}
                                className="flex-grow focus:border-red-500 dark:bg-[#0d0d0d] rounded-lg border-2 border-black md:px-5 py-2 font-bold transition-all focus:ring-0"
                                onChange={(e) => setUserInput(e.target.value)}
                                value={userInput}
                                required
                            />
                            <button
                                disabled={isLoading || userInput.trim() === ''}
                                className={`border-black border-2 p-1 hover:border-black hover:shadow-custom hover:-translate-y-0.5 bg-red-500 hover:opacity-80 text-white rounded-lg transition-all`}
                            >
                                {isLoading ? 'Unleashing Dragon...' : 'Summon Dragon 🔥'}
                            </button>
                        </div>
                        <div className="md:ml-20 flex items-center">
                            <span className="opacity-80 text-sm">{`${userInput.length}/50`}</span>
                        </div>
                        {generated && (
                            <p className={'md:text-left text-center md:ml-20 text-[#FFD700]'}>
                                nodes with gold border can be clicked to go to link
                            </p>
                        )}
                    </form>
                    {!isLoading ?
                        (
                            <div id="cy" className="h-[600px] dark:bg-[#0d0d0d] border-2 border-black md:mx-20  rounded-md shadow-custom"></div>
                        ) : (
                            <div className={'relative h-[600px] dark:bg-[#0d0d0d] z-10 border-2 border-black md:mx-20 rounded-md shadow-custom'}>
                                <div className="w-full">
                                    <div className="absolute bg-white dark:bg-[#0d0d0d] w-full rounded-md h-full left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center">
                                        <div role="status">
                                            <svg
                                                className="mr-2 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-300"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="fire-stroke"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    strokeWidth="4"
                                                    fill={
                                                        localStorage.getItem(LOCALSTORAGE_THEME_KEY) === LIGHT_THEME_KEY
                                                            ? "white"
                                                            : "#1a1a1a"
                                                    }
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill={"white"}
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        </div>
                                        <span className="text-center font-bold">Loading</span>
                                        <p>This might take 1-2 minutes...</p>
                                    </div>
                                </div>
                            </div>
                        )

                    }
                </div>
            </div>
            {isLoading && (
                <StatusBar message={'🐉 Gathering knowledge scrolls...'} color={'bg-green-500'} />
            )}
            {generated && (
                <StatusBar message={'👑 The dragon has summoned the knowledge! 📜'} color={'bg-[#FFD700]'} />
            )}
            <Footer />
        </div>


    );
}


