// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT543.
    /// </summary>
    public class HCT534 : ClockedChip
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hc534.pdf

        private const double TYP_PROPAGATION_DELAY = 21;

        #region Private/Protected Fields
        protected Pin FF0;
        protected Pin FF1;
        protected Pin FF2;
        protected Pin FF3;
        protected Pin FF4;
        protected Pin FF5;
        protected Pin FF6;
        protected Pin FF7;
        //protected bool LastEnable;

        protected Pin[] FFs;
        #endregion Private/Protected Fields

        #region Input Pins
        public Pin OEn;

        public Pin D0;
        public Pin D1;
        public Pin D2;
        public Pin D3;
        public Pin D4;
        public Pin D5;
        public Pin D6;
        public Pin D7;
        #endregion Input Pins

        #region Output Pins
        public Pin Q0n;
        public Pin Q1n;
        public Pin Q2n;
        public Pin Q3n;
        public Pin Q4n;
        public Pin Q5n;
        public Pin Q6n;
        public Pin Q7n;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT534(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT534(string Name, Net NetCLK, Net NetOEn, Net NetD0, Net NetD1, Net NetD2, Net NetD3, Net NetD4, Net NetD5, Net NetD6, Net NetD7) : base(Name, "CLK", "11", NetCLK)
        {
            //LastEnable = true;

            this.Power[0] =  new Pin(this, "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.OEn = new Pin(this, "OEn", "1", LineMode.In, SignalState.L, NetOEn);

            this.D0 = new Pin(this, "D0",  "3", LineMode.In, SignalState.L, NetD0);
            this.D1 = new Pin(this, "D1",  "4", LineMode.In, SignalState.L, NetD1);
            this.D2 = new Pin(this, "D2",  "7", LineMode.In, SignalState.L, NetD2);
            this.D3 = new Pin(this, "D3",  "8", LineMode.In, SignalState.L, NetD3);
            this.D4 = new Pin(this, "D4", "13", LineMode.In, SignalState.L, NetD4);
            this.D5 = new Pin(this, "D5", "14", LineMode.In, SignalState.L, NetD5);
            this.D6 = new Pin(this, "D6", "17", LineMode.In, SignalState.L, NetD6);
            this.D7 = new Pin(this, "D7", "18", LineMode.In, SignalState.L, NetD7);

            this.FF0 = new Pin(this, "FF0", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF1 = new Pin(this, "FF1", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF2 = new Pin(this, "FF2", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF3 = new Pin(this, "FF3", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF4 = new Pin(this, "FF4", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF5 = new Pin(this, "FF5", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF6 = new Pin(this, "FF6", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF7 = new Pin(this, "FF7", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            FFs = new Pin[] { this.FF0, this.FF1, this.FF2, this.FF3, this.FF4, this.FF5, this.FF6, this.FF7};

            this.Q0n = new Pin(this, "Q0n",  "2", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1n = new Pin(this, "Q1n",  "5", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2n = new Pin(this, "Q2n",  "6", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q3n = new Pin(this, "Q3n",  "9", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q4n = new Pin(this, "Q4n", "12", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q5n = new Pin(this, "Q5n", "15", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q6n = new Pin(this, "Q6n", "16", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q7n = new Pin(this, "Q7n", "19", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.CLK);
            SetPinArray(Inputs, 1, this.OEn);
            SetPinArray(Inputs, 2, new Pin[] { this.D0, this.D1, this.D2, this.D3, this.D4, this.D5, this.D6, this.D7 });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.Q0n, this.Q1n, this.Q2n, this.Q3n, this.Q4n, this.Q5n, this.Q6n, this.Q7n });

        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Called on the rising edge of the clock to load.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void RisingEdge(double Time)
        {
            for (int i = 0; i < Inputs[2].Length; i++)
                FFs[i].SetOutState(Pin.InvertedState(Inputs[2][i].State));

            if (OEn.State == SignalState.L)
                for (int i = 0; i < Inputs[2].Length; i++)
                    Outputs[0][i].NewOutState = Pin.InvertedState(Inputs[2][i].State);

            //SetOutputChangeTime(Time);
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            if (OEn.State == SignalState.L)
            {
                //if (LastEnable == false)
                {
                    for (int i = 0; i < Inputs[2].Length; i++)
                        Outputs[0][i].NewOutState = FFs[i].State;

                    //LastEnable = true;
                }
            }
            else
            {
                //if (LastEnable == true)
                {
                    for (int i = 0; i < Outputs[0].Length; i++)
                        Outputs[0][i].NewOutState = SignalState.Z;

                    //LastEnable = false;
                }
            }
        }
        #endregion Public Methods

    }
}
