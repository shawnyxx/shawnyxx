/*
    Firestore Library - Modular
    Shawnyxx - [STABLE]
    Allows you to manage the data on the Firestore database in a very simple way
    For example, to add a variable to the user's data (eg. money), you can do this:
        Firestore({ Method: "update", CollectionName: "users", Document: "<user_email>", Data: <user_data> })

    License
    The code of this file should not be shared, copied, modified or updated without the authorization of Ecxo Games
    Any un-authorized modification to this file will result in legal actions taken against the actor in question
*/

// Libraries Imports
import { db } from "./Firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, getDocs, collection, query as firestoreQuery, where, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';

// Set the data in the database (supports subcollections)
const Set = async (CollectionName, Document, Data, SubCollection, SubDocument) => {
    try {
        if (SubCollection && SubDocument) {
            await setDoc(doc(db, CollectionName, Document, SubCollection, SubDocument), Data);
        } else {
            await setDoc(doc(db, CollectionName, Document), Data);
        }
        return true;
    } catch (error) {
        console.error("Error setting document:", error);
        return null;
    }
};

// Get the documents from a collection or a subcollection
const Docs = async (CollectionName, Document, SubCollectionName) => {
    try {
        if (Document && SubCollectionName) {
            const querySnapshot = await getDocs(collection(db, CollectionName, Document, SubCollectionName));
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return data;
        }

        const querySnapshot = await getDocs(collection(db, CollectionName));
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return data;
    } catch (error) {
        return null;
    }
};

// Add a document to the database (supports both main collections and subcollections)
const Add = async (CollectionName, Document, Data, SubCollection, SubDocument) => {
    try {
        if (SubCollection && SubDocument) {
            // Add document to a subcollection
            const docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
            await setDoc(docRef, Data);
        } else {
            // Add document to main collection
            await setDoc(doc(db, CollectionName, Document), Data);
        }
        return true;
    } catch (error) {
        console.error("Error adding document:", error);
        return null;
    }
}

// Update the data in the database
const Update = async (CollectionName, Document, Data, SubCollection, SubDocument) => {
    try {
        if (SubCollection && SubDocument) {
            // Update document in a subcollection
            const docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
            await updateDoc(docRef, Data);
        } else {
            // Update main document
            await updateDoc(doc(db, CollectionName, Document), Data);
        }
        return true;
    } catch (error) {
        console.error("Error updating document:", error);
        return null;
    }
};

// Get the data from a document of the database
const Get = async (CollectionName, Document, SubCollectionName, SubDocument) => {
    try {
        if (SubDocument && SubCollectionName) {
            // Get document from subcollection
            const docRef = doc(db, CollectionName, Document, SubCollectionName, SubDocument);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } else if (SubCollectionName) {
            const SubCollectionRef = collection(db, CollectionName, Document, SubCollectionName);
            const snapshot = await getDocs(SubCollectionRef);

            if (snapshot.empty) {
                return {};
            }

            const data = {};
            snapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });

            return data;
        } else {
            const docRef = doc(db, CollectionName, Document);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        return null;
    }
}

// Subscribe to real-time updates (supports document, subdocument and query/subcollection queries)
const Subscribe = (CollectionName, Document, Field, Operator, Value, Callback, SubCollection, SubDocument) => {
    try {
        // Query subscription (collection or subcollection)
        if (Field && Operator && Value) {
            let q;

            if (SubCollection && Document) {
                q = firestoreQuery(
                    collection(db, CollectionName, Document, SubCollection),
                    where(Field, Operator, Value)
                );
            } else {
                q = firestoreQuery(
                    collection(db, CollectionName),
                    where(Field, Operator, Value)
                );
            }

            return onSnapshot(q, (querySnapshot) => {
                const results = [];
                querySnapshot.forEach((doc) => {
                    results.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                Callback(results);
            });
        }

        // Document (or subdocument) subscription
        let docRef;
        if (SubCollection && SubDocument) {
            docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
        } else {
            docRef = doc(db, CollectionName, Document);
        }

        return onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                Callback(snapshot.data());
            } else {
                Callback(null);
            }
        });
    } catch (error) {
        console.error("Error subscribing:", error);
        return null;
    }
};

// Delete a document or a field from the database (supports subcollections)
const Remove = async (Type, CollectionName, Document, Field, SubCollection, SubDocument) => {
    try {
        if (Type === "document") {
            if (SubCollection && SubDocument) {
                await deleteDoc(doc(db, CollectionName, Document, SubCollection, SubDocument));
            } else {
                await deleteDoc(doc(db, CollectionName, Document));
            }
            return true;
        } else if (Type === "field") {
            let docRef;
            if (SubCollection && SubDocument) {
                docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
            } else {
                docRef = doc(db, CollectionName, Document);
            }
            await updateDoc(docRef, {
                [Field]: deleteField()
            });
            return true;
        } else {
            console.error("Invalid Type for delete operation:", Type);
            return null;
        }
    } catch (error) {
        console.error(`Error deleting ${Type}:`, error);
        return null;
    }
};

// Query documents based on field criteria (supports subcollections)
const Query = async (CollectionName, Field, Operator, Value, SubCollection, Document) => {
    try {
        let collRef;
        if (SubCollection && Document) {
            collRef = collection(db, CollectionName, Document, SubCollection);
        } else {
            collRef = collection(db, CollectionName);
        }

        const q = firestoreQuery(
            collRef,
            where(Field, Operator, Value)
        );

        const querySnapshot = await getDocs(q);
        const results = [];

        querySnapshot.forEach((doc) => {
            results.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return results;
    } catch (error) {
        console.error("Error querying documents:", error);
        return null;
    }
};

// Add item to array field
const ArrayAdd = async (CollectionName, Document, Field, Value, SubCollection, SubDocument) => {
    try {
        let docRef;
        if (SubCollection && SubDocument) {
            docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
        } else {
            docRef = doc(db, CollectionName, Document);
        }
        
        await updateDoc(docRef, {
            [Field]: arrayUnion(Value)
        });
        return true;
    } catch (error) {
        console.error("Error adding to array:", error);
        return null;
    }
};

// Remove item from array field
const ArrayRemove = async (CollectionName, Document, Field, Value, SubCollection, SubDocument) => {
    try {
        let docRef;
        if (SubCollection && SubDocument) {
            docRef = doc(db, CollectionName, Document, SubCollection, SubDocument);
        } else {
            docRef = doc(db, CollectionName, Document);
        }
        
        await updateDoc(docRef, {
            [Field]: arrayRemove(Value)
        });
        return true;
    } catch (error) {
        console.error("Error removing from array:", error);
        return null;
    }
};

// Handle the States Handler
export default function Firestore({ CollectionName, Type, Document, Method, Data, Value, Field, Operator, SubCollection, SubDocument, Callback }) {
    switch (Method) {
        case "get":
            return Get(CollectionName, Document, SubCollection, SubDocument);

        case "docs":
            return Docs(CollectionName, Document, SubCollection);

        case "set":
            return Set(CollectionName, Document, Data, SubCollection, SubDocument);

        case "subscribe":
            return Subscribe(CollectionName, Document, Field, Operator, Value, Callback, SubCollection, SubDocument);

        case "add":
            return Add(CollectionName, Document, Data, SubCollection, SubDocument);

        case "update":
            return Update(CollectionName, Document, Data, SubCollection, SubDocument);

        case "delete":
            return Remove(Type, CollectionName, Document, Field, SubCollection, SubDocument);

        case "query":
            return Query(CollectionName, Field, Operator, Value, SubCollection, Document);

        case "arrayAdd":
            return ArrayAdd(CollectionName, Document, Field, Value, SubCollection, SubDocument);

        case "arrayRemove":
            return ArrayRemove(CollectionName, Document, Field, Value, SubCollection, SubDocument);

        default:
            throw new Error("Invalid method");
    }
}