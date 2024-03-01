'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { LensClient, development, IStorageProvider, Success } from "@lens-protocol/client";
import { Wallet } from "ethers";
import { forEachChild } from 'typescript';

class LocalStorageProvider implements IStorageProvider {
  getItem(key: string) {
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string) {
    window.localStorage.setItem(key, value);
  }

  removeItem(key: string) {
    window.localStorage.removeItem(key);
  }
}

export default function Home() {

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [addrPriv, setAddrPriv] = useState('');
  const [ipfsLink, setIpfsLink] = useState('');
  const [profileId, setProfileId] = useState('');
  const [post, setPost] = useState(0);
  const [publications, setPublications] = useState(0);
  const [mirror, setMirror] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [createdAt, setCreatedAt] = useState('');
  const [status, setStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storedItem, setStoredItem] = useState('');

  const lensClientConfig = {
    environment: development,
    storage: new LocalStorageProvider()
  }
  const localStorageProvider = new LocalStorageProvider();
  const lensClient = new LensClient(lensClientConfig);

  const handleChange = (e: any) => {
    setInputValue(e.target.value);
  };

  const handleChange2 = (e: any) => {
    setAddrPriv(e.target.value);
  };

  const handleChange3 = (e: any) => {
    setIpfsLink(e.target.value);
  };

  const isInputValueNotEmpty = (value: string) => {
    const trimmedValue = value.trim();
    console.log(trimmedValue);
    return trimmedValue !== '';
  };

  const createProfile = async (addr: string) => {

    //check for existing profiles
    const allOwnedProfiles = await lensClient.profile.fetchAll({
      where: {
        ownedBy: [addr],
      },
    });

    const arrayLength = allOwnedProfiles.items.map((i) => ({ id: i.id, handle: i.handle, major: i })).length;
    console.log('hereeee')
    if (arrayLength > 0) {

      const id = allOwnedProfiles.items.map((i) => i.id);

      //extract the first profile Id
      setProfileId(id[0]);
      console.log(profileId)


      // parse information about the profile
      const profile = await lensClient.profile.fetch({
        forProfileId: id[0],
      });

      const parsedDate = new Date(profile?.createdAt ? profile.createdAt : '');
      const formattedDate = parsedDate.toLocaleDateString('en-US');
      setPost(profile?.stats.posts ? profile.stats.posts : 0);
      setPublications(profile?.stats.publications ? profile.stats.publications : 0);
      setMirror(profile?.stats.mirrors ? profile.stats.mirrors : 0);
      setFollowers(profile?.stats.followers ? profile.stats.followers : 0);
      setFollowing(profile?.stats.following ? profile.stats.following : 0);
      setCreatedAt(formattedDate);
    }
    else {
      const profileCreateResult = await lensClient.wallet.createProfile({
        to: addr,
      });

      const allOwnedProfiles = await lensClient.profile.fetchAll({
        where: {
          ownedBy: [addr],
        },
      });

      const id = allOwnedProfiles.items.map((i) => i.id);

      // extract the first profile Id
      setProfileId(id[0]);

      //parse information about the profile
      const profile = await lensClient.profile.fetch({
        forProfileId: id[0],
      });

      const parsedDate = new Date(profile?.createdAt ? profile.createdAt : '');
      const formattedDate = parsedDate.toLocaleDateString('en-US');
      // const trimmedDateString = parsedDate.replace(/\s+GMT.*/, '');
      setPost(profile?.stats.posts ? profile.stats.posts : 0);
      setPublications(profile?.stats.publications ? profile.stats.publications : 0);
      setMirror(profile?.stats.mirrors ? profile.stats.mirrors : 0);
      setFollowers(profile?.stats.followers ? profile.stats.followers : 0);
      setFollowing(profile?.stats.following ? profile.stats.following : 0);
      setCreatedAt(formattedDate);

    }
  };

  const authenticate = async (addr: string) => {

    const wallet = new Wallet(addr);

    const { id, text } = await lensClient.authentication.generateChallenge({
      signedBy: inputValue,
      for: profileId,
    });

    const signature = await wallet.signMessage(text);

    await lensClient.authentication.authenticate({
      id,
      signature
    });
  }

  const broadcastOnchain = async (addr: string, ipfs: string) => {
    const wallet = new Wallet(addr);

    const resultTypedData = await lensClient.publication.createOnchainPostTypedData({
      contentURI: ipfs,
    });

    const { id, typedData } = resultTypedData.unwrap();


    // sign with the wallet
    const signedTypedData = await wallet._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.value
    );

    // broadcast onchain
    const broadcastOnchainResult = await lensClient.transaction.broadcastOnchain({
      id,
      signature: signedTypedData,
    });


    const onchainRelayResult = broadcastOnchainResult.unwrap();

    if (onchainRelayResult.__typename === "RelayError") {
      console.log(`Something went wrong`);
      setError('Something went wrong');
      setTimeout(() => {
        setError('');
      }, 1500);
      return;
    }

    setSuccess('Post is successfully created');
    setTimeout(() => {
      setSuccess('');
    }, 1500);

    console.log(
      `Successfully changed profile managers with transaction with id ${onchainRelayResult}, txHash: ${onchainRelayResult.txHash}`
    );

  }

  const handleClick2 = async () => {
    setLoading(true);
    if (!isInputValueNotEmpty(addrPriv) && !isInputValueNotEmpty(ipfsLink)) {
      setError('Please, fill the form appropraitely.')

      setTimeout(() => {
        setError('');
      }, 1500);

      setLoading(false);
      // console.log(inputValue);

    } else {

      try {
        setLoading(true);

        await authenticate(addrPriv)
        await broadcastOnchain(addrPriv, ipfsLink);

        setLoading(false);
        // setStatus(true);

      } catch (error) {
        setError('error broadcasting your post');
        // console.log(error);
        setTimeout(() => {
          setError('');
        }, 1500);
      }
      setLoading(false);

    }

  }

  const handleClick = async () => {
    setLoading(true);

    if (!isInputValueNotEmpty(inputValue)) {
      setError('Please, fill the form appropraitely.')

      setTimeout(() => {
        setError('');
      }, 1500);

      setLoading(false);
      // console.log(inputValue);

    } else {
      setLoading(true);

      try {

        await createProfile(inputValue);

        setStatus(true);
        setLoading(false);

      } catch (error) {
        setError('error creating your profile');
        console.log(error);
        setTimeout(() => {
          setError('');
        }, 1500);
      }
      setLoading(false);
    }

  }




  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedData = localStorageProvider.getItem('status');
        if (storedData) {
          setStoredItem(storedData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('No account associated with the address')
      }
    };

    fetchData();


    // console.log(getAuthenticatedClientFromEthersWallet(user, '0x07d3'))
  }, [status]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <p>Lensify</p>
      </div>
      {status ?
        <div className={styles.container}>
          <div className={styles.authHeader}>
            <p>Profile Id: {profileId}</p>
            <p>Mirrors: {mirror}</p>
            <p>Posts: {post}</p>
            <p>Publications: {publications}</p>
            <p>Followers: {followers}</p>
            <p>Following: {following}</p>
            <p>Created at: {createdAt}</p>
          </div>
          <div className={styles.body}>
            <p className={styles.bodyError}>{error}</p>
            <p className={styles.bodySuccess}>{success}</p>
            <input className={styles.bodyInput} type='text' onChange={handleChange2} placeholder='Enter your private key' />
            <input className={styles.bodyInput} type='text' onChange={handleChange3} placeholder='Enter your IPFS link' />
            {loading ? (
              <button className={styles.bodyInputButton} disabled>Loading...</button>
            ) : (
              <button className={styles.bodyInputButton} onClick={handleClick2}>Post</button>
            )}
          </div>
        </div>
        :
        <div className={styles.container}>
          <p className={styles.bodyError}>{error}</p>
          <div className={styles.body}>
            {/* <input className={styles.bodyInput} type='text' onChange={handleChange2} placeholder='Enter a unique name' /> */}
            <input className={styles.bodyInput} type='text' onChange={handleChange} placeholder='Enter your Ethereum address' />
            {loading ? (
              <button className={styles.bodyInputButton} disabled>Loading...</button>
            ) : (
              <button className={styles.bodyInputButton} onClick={handleClick}>Create profile</button>
            )}
          </div>
        </div>}
    </main>
  )
}
