const gsmarena = require('gsmarena-api');
const OpenAI = require('openai');
const fs = require('fs');
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, push, onValue } = require("firebase/database");
const { Pinecone } = require('@pinecone-database/pinecone');
const { uuid } = require('uuidv4');

class GadgetManager {
    constructor(firebaseConfig, openAIConfig, pineconeConfig) {
        // Inisialisasi aplikasi Firebase dan koneksi database
        this.firebaseApp = initializeApp(firebaseConfig);
        this.database = getDatabase(this.firebaseApp);
        
        // Inisialisasi klien OpenAI dengan API key
        this.openAIClient = new OpenAI({ apiKey: openAIConfig.apiKey });
        
        // Inisialisasi klien Pinecone dan mengatur referensi indeks
        this.pineconeClient = new Pinecone({ apiKey: pineconeConfig.apiKey });
        this.pineconeIndex = this.pineconeClient.index(
            pineconeConfig.indexName,
            pineconeConfig.indexUrl
        );
    }

    // Mengambil data gadget terbaru dari GSMArena
    async fetchLatestGadgets() {
        try {
            console.log("Mengambil data gadget terbaru dari GSMArena...");
            const data = await gsmarena.catalog.getLatest();
            console.log(`Berhasil mengambil ${data.length} gadget dari GSMArena.`);
            return data;
        } catch (error) {
            console.error("Terjadi kesalahan saat mengambil data dari GSMArena:", error);
            throw error;
        }
    }

    // Menyimpan data gadget ke Firebase Realtime Database
    async saveGadgetToDatabase(gadget) {
        try {
            console.log(`Menyimpan gadget: ${gadget.name} ke Firebase...`);
            const dbRef = ref(this.database, 'gadget');
            await push(dbRef, gadget);
            console.log(`Gadget: ${gadget.name} berhasil disimpan.`);
        } catch (error) {
            console.error(`Terjadi kesalahan saat menyimpan gadget: ${gadget.name} ke Firebase:`, error);
        }
    }

    // Memeriksa data gadget yang sudah ada di Firebase
    async checkDatabase() {
        try {
            console.log("Memeriksa data yang sudah ada di Firebase...");
            const dbRef = ref(this.database, 'gadget');
            return new Promise((resolve) => {
                onValue(dbRef, (snapshot) => {
                    const data = snapshot.val();
                    resolve(data || {});
                });
            });
        } catch (error) {
            console.error("Terjadi kesalahan saat memeriksa data di Firebase:", error);
            throw error;
        }
    }

    // Fungsi untuk memberikan jeda (delay) dalam eksekusi
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Mengambil spesifikasi tertentu dari sebuah perangkat
    getSpec(device, category, specName) {
        const categoryData = device.detailSpec.find(item => item.category === category);
        return categoryData?.specifications.find(spec => spec.name === specName)?.value || "";
    }

    // Menggabungkan semua jenis kamera utama menjadi satu string
    getMainCamera(device) {
        const cameraTypes = ["Single", "Dual", "Triple", "Quad"];
        const categoryData = device.detailSpec.find(item => item.category === "Main Camera");

        if (!categoryData) return "";

        return cameraTypes
            .map(type => categoryData.specifications.find(spec => spec.name === type)?.value || "")
            .filter(camera => camera)
            .join(", ");
    }

    // Membuat embeddings untuk gadget baru dan menyimpannya ke Pinecone
    async generateEmbeddings(newGadgets) {
        const dataEmbed = [];

        for (const gadget of newGadgets) {
            const deviceLink = gadget.link.replace('.php', ''); // Mengubah format link
            const device = await gsmarena.catalog.getDevice(deviceLink); // Mengambil detail perangkat
            console.log(`Mengambil data untuk ${device.name}...`);

            // Membuat string data terstruktur untuk embeddings
            const embeddingData = `Nama: ${device.name || ""},
            Prosesor: ${this.getSpec(device, "Platform", "Chipset")},
            Sistem Operasi: ${this.getSpec(device, "Platform", "OS")},
            Memori Internal: ${this.getSpec(device, "Memory", "Internal")},
            Kapasitas Baterai: ${this.getSpec(device, "Battery", "Type")},
            Ukuran Layar: ${this.getSpec(device, "Display", "Size")},
            Resolusi Layar: ${this.getSpec(device, "Display", "Resolution")},
            Kamera Utama: ${this.getMainCamera(device)},
            Kamera Depan: ${this.getSpec(device, "Selfie camera", "Single")},
            Status: ${this.getSpec(device, "Launch", "Status")},
            Harga: ${this.getSpec(device, "Misc", "Price") || 0}`;

            dataEmbed.push(embeddingData);
            await this.delay(300000); // Memberikan jeda untuk mencegah rate limiting
        }

        if (dataEmbed.length > 0) {
            // Membuat embeddings menggunakan API OpenAI
            const embeddings = await this.openAIClient.embeddings.create({
                model: "text-embedding-3-large",
                input: dataEmbed,
                encoding_format: "float",
            });

            // Menyiapkan data untuk diunggah ke Pinecone
            const upserts = embeddings.data.map((embedding, index) => ({
                id: uuid(),
                values: embedding.embedding,
                metadata: {
                    text: dataEmbed[index],
                    blobType: "",
                    source: "blob",
                    "loc.lines.from": "1",
                    "loc.lines.to": "11",
                },
            }));

            // Menyimpan embeddings ke Pinecone
            const response = await this.pineconeIndex.namespace("data_gadget").upsert(upserts);
            console.log(response);
        } else {
            console.log("Tidak ada embeddings yang dihasilkan.");
        }
    }

    // Fungsi utama untuk mengatur alur pemrosesan data
    async run() {
        try {
            console.log("Memulai proses...");

            const latestGadgets = await this.fetchLatestGadgets(); // Langkah 1: Mengambil gadget terbaru
            const existingGadgets = await this.checkDatabase(); // Langkah 2: Memeriksa data di Firebase

            console.log(`Data yang sudah ada di Firebase: ${Object.keys(existingGadgets).length} entri ditemukan.`);

            // Menyaring gadget baru yang belum ada di Firebase
            const newGadgets = latestGadgets.filter(
                gadget => !Object.values(existingGadgets).some(
                    existingGadget => existingGadget.name === gadget.name
                )
            );

            // Menyimpan gadget baru ke Firebase
            for (const gadget of newGadgets) {
                await this.saveGadgetToDatabase(gadget);
            }

            if (newGadgets.length > 0) {
                // Membuat embeddings dan menyimpannya ke Pinecone jika ada gadget baru
                await this.generateEmbeddings(newGadgets);
            } else {
                console.log("Tidak ada gadget baru untuk disimpan.");
            }

            console.log("Proses selesai dengan sukses!");
        } catch (error) {
            console.error("Terjadi kesalahan selama proses:", error);
        }
    }
}

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBSruoQaGuWt8cmSx4F5NQ6E5HYlABxrF8",
    authDomain: "gadgetbot-e9a0f.firebaseapp.com",
    databaseURL: "https://gadgetbot-e9a0f-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "gadgetbot-e9a0f",
    storageBucket: "gadgetbot-e9a0f.firebaseapp.com",
    messagingSenderId: "582252293073",
    appId: "1:582252293073:web:4ff0a291c1e5fa2d7d8ef0",
};

const openAIConfig = {
    apiKey: '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',
};

const pineconeConfig = {
    apiKey: "pcsk_6Jo2A8_MZPiwNwWfYV1jjfgGcQS49AqYByWkCu61FrfyUsBDKoVnFrRtPifCCakLtj9m3r",
    indexName: "dbgadget",
    indexUrl: "https://dbgadget-phlwcrc.svc.aped-4627-b74a.pinecone.io",
};

const manager = new GadgetManager(firebaseConfig, openAIConfig, pineconeConfig);
manager.run();
