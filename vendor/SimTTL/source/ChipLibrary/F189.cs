// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.Diagnostics;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the 14x4 RAM chip 74F189.
    /// </summary>
    public class F189: BaseElement
    {
        // Datasheet: https://www.digikey.com/htmldatasheets/production/142151/0/0/1/74f189.html

        private const double ACCESS_TIME = 18.5; // in ns

        #region Private Fields
        private byte[] Mem;
        private Pin[] addrBus;
        private Pin[] dataBusIn;
        private Pin[] dataBusOut;
        private SignalState lastWEn;
        private double WEnTime;
        #endregion Private Fields

        #region Control Pins
        public Pin WEn;
        public Pin CSn;
        #endregion Control Pins

        #region Address Pins
        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;
        #endregion Address Pins

        #region Data Pins
        public Pin D0;
        public Pin D1;
        public Pin D2;
        public Pin D3;

        public Pin O0n;
        public Pin O1n;
        public Pin O2n;
        public Pin O3n;
        #endregion Data Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public F189(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }


        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public F189(string Name, Net NetWEn, Net NetCSn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetD0, Net NetD1, Net NetD2, Net NetD3) : base(Name)
        {
            this.Mem = new byte[16];
            for (int i = 0; i < this.Mem.Length; i++)
                Mem[i] = (byte)((i ^ 0x0F) & 0x0F); 

            lastWEn = SignalState.H;
            WEnTime = 0;

            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.WEn = new Pin(this, "WEn", "3", LineMode.In, SignalState.L, NetWEn);
            this.CSn = new Pin(this, "CSn", "2", LineMode.In, SignalState.L, NetCSn);

            this.A0 = new Pin(this, "A0",  "1", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this, "A1", "15", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "14", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "13", LineMode.In, SignalState.L, NetA3);
                                                                         
            this.D0 = new Pin(this, "D0",  "4", LineMode.In, SignalState.L, NetD0);
            this.D1 = new Pin(this, "D1",  "6", LineMode.In, SignalState.L, NetD1);
            this.D2 = new Pin(this, "D2", "10", LineMode.In, SignalState.L, NetD2);
            this.D3 = new Pin(this, "D3", "12", LineMode.In, SignalState.L, NetD3);

            this.O0n = new Pin(this, "O0n",  "5", LineMode.Out, SignalState.L, ACCESS_TIME);
            this.O1n = new Pin(this, "O1n",  "7", LineMode.Out, SignalState.L, ACCESS_TIME);
            this.O2n = new Pin(this, "O2n",  "9", LineMode.Out, SignalState.L, ACCESS_TIME);
            this.O3n = new Pin(this, "O3n", "11", LineMode.Out, SignalState.L, ACCESS_TIME);
            

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.WEn);
            SetPinArray(Inputs, 1, this.CSn);
            addrBus = new Pin[] { this.A0, this.A1, this.A2, this.A3 };
            Inputs[2] = addrBus;
            dataBusIn = new Pin[] { this.D0, this.D1, this.D2, this.D3 };
            Inputs[3] = dataBusIn;

            Outputs = new Pin[1][];
            dataBusOut = new Pin[] { this.O0n, this.O1n, this.O2n, this.O3n };
            Outputs[0] = dataBusOut;

            SimulationRestart();
        }
        #endregion Constructors

        #region Protected Methods
        /// <summary>
        /// Build the address from the address pin states
        /// </summary>
        /// <returns>Address as integer.</returns>
        protected int GetAddr()
        {
            int addr = 0;
            for (int i = 0; i < addrBus.Length; i++)
            {
                if (addrBus[i].State == SignalState.L)
                { }
                else if (addrBus[i].State == SignalState.H)
                {
                    addr |= 1 << i;
                }
                else
                {
                    SetNewOutputStates(0, SignalState.U);
                    return -1;
                }
            }
            return addr;
        }
        #endregion Protected Methods

        #region Public Methods
        /// <summary>
        /// Load the contents of a binary file into the element.
        /// </summary>
        /// <param name="FileName">Full file name of the file to be loaded.</param>
        /// <param name="HighNibble">True, to extract the higher 4 bit</param>
        public void LoadContents(string FileName, bool HighNibble)
        {
            byte[] buffer = File.ReadAllBytes(FileName);

            for (int i = 0; i < Mem.Length; i++)
                if (HighNibble == false)
                    Mem[i] = (byte)(buffer[i] & 0xF);
                else
                    Mem[i] = (byte)(buffer[i] >> 4);
        }

        private byte SwapBits(byte Nibble)
        {
            byte result = 0;
            if ((Nibble & 8) != 0)
                result |= 1;
            if ((Nibble & 4) != 0)
                result |= 2;
            if ((Nibble & 2) != 0)
                result |= 4;
            if ((Nibble & 1) != 0)
                result |= 8;
            return result;
        }

        /// <summary>
        /// Load the contents of a binary file into the element.
        /// </summary>
        /// <param name="FileName">Full file name of the file to be loaded.</param>
        /// <param name="HighNibble">True, to extract the higher 4 bit</param>
        /// <param name="Swap">True, to swap the 4 bit order</param>
        public void LoadContents(string FileName, bool HighNibble, bool Swap)
        {
            byte[] buffer = File.ReadAllBytes(FileName);

            for (int i = 0; i < Mem.Length; i++)
                if (HighNibble == false)
                {
                    if (Swap)
                        Mem[i] = SwapBits((byte)(buffer[i] & 0xF));
                    else
                        Mem[i] = (byte)(buffer[i] & 0xF);
                }
                else
                {
                    if (Swap)
                        Mem[i] = SwapBits((byte)(buffer[i] >> 4));
                    else
                        Mem[i] = (byte)(buffer[i] >> 4);
                }
        }


        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            if (CSn.State == SignalState.L)
            {
                if (WEn.State == SignalState.L)
                {
                    if (lastWEn == SignalState.H)
                    {
                        lastWEn = WEn.State;
                        WEnTime = Time;
                        SetNewOutputStates(0, SignalState.Z);
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",RAM Write,WEn falling edge");
#endif
                    }
                    else if ((Time - WEnTime) > 10)
                    {
                        int addr = GetAddr();
                        int data = 0;
                        if (addr >= 0)
                        {
                            for (int i = 0; i < dataBusIn.Length; i++)
                            {
                                dataBusIn[i].UpdateInput(Time);

                                if (dataBusIn[i].State == SignalState.L)
                                { }
                                else if (dataBusIn[i].State == SignalState.H)
                                {
                                    data |= 1 << i;
                                }
                            }
                            Mem[addr] = (byte)data;
                        }
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",RAM Write,Addr=0x" + addr.ToString("X04") + ",Data=" + data.ToString("X02"));
#endif
                    }
                }
                else
                {
                    int addr = GetAddr();
                    int data = 0;
                    if (addr >= 0)
                    {
                        data = Mem[addr];
                        for (int i = 0; i < dataBusOut.Length; i++)
                        {
                            if ((data & 1) == 0)
                                dataBusOut[i].NewOutState = SignalState.H;
                            else
                                dataBusOut[i].NewOutState = SignalState.L;

                            data >>= 1;
                        }
                    }
                    lastWEn = WEn.State;
                    WEnTime = Time;

#if DEBUG_WRITE
                    Debug.WriteLine("Time=" + Time.ToString() + ",RAM Read,Addr=0x" + addr.ToString("X04") + ",Data=" + data.ToString("X02"));
#endif
                }

            }
            else
            {
                lastWEn = WEn.State;
                WEnTime = Time;
                SetNewOutputStates(0, SignalState.Z);
            }

        }
        #endregion Public Methods

    }
}
